import { collection, query, where, getDocs, updateDoc, doc, type QuerySnapshot, type DocumentData } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { type Property } from '@/types/Property';
import { PropertyLookupErrorHandler, DatabaseErrorHandler, ValidationUtils, ErrorLogger, RetryUtils } from '@/utils/errorHandling';

export class PropertyService {
    /**
     * Validate that a property has a valid Firestore document ID
     * @param property The property to validate
     * @returns true if valid, false otherwise
     */
    static validatePropertyDocumentId(property: Property | null): boolean {
        if (!property) {
            return false;
        }
        
        if (!property.id || typeof property.id !== 'string' || property.id.trim().length === 0) {
            console.error('Property missing or has invalid Firestore document ID:', property);
            return false;
        }
        
        return true;
    }

    /**
     * Update property pending request status with comprehensive error handling
     * @param propertyDocId The Firestore document ID of the property
     * @param hasPending Whether the property has pending requests
     */
    static async updatePendingRequestStatus(propertyDocId: string, hasPending: boolean): Promise<void> {
        try {
            // Validate input
            const validation = ValidationUtils.validatePropertyDocumentId(propertyDocId);
            if (!validation.isValid) {
                const error = new Error(validation.error);
                ErrorLogger.logError(error, {
                    operation: 'updatePendingRequestStatus',
                    propertyId: propertyDocId,
                    additionalData: { hasPending }
                });
                throw error;
            }

            const updateData: any = {
                hasPendingRequest: hasPending,
            };
            
            // If setting to pending, add timestamp; if clearing, remove timestamp
            if (hasPending) {
                updateData.lastRequestTimestamp = new Date().toISOString();
            } else {
                updateData.lastRequestTimestamp = null;
            }
            
            // Execute with retry logic for network resilience
            await RetryUtils.withRetry(
                () => updateDoc(doc(db, 'properties', propertyDocId), updateData),
                {
                    maxAttempts: 3,
                    baseDelay: 1000,
                    retryCondition: (error) => {
                        // Retry on network errors but not on permission/validation errors
                        return error.code === 'unavailable' || 
                               error.code === 'deadline-exceeded' ||
                               error.message?.includes('network');
                    }
                }
            );
            
            console.log(`Property ${propertyDocId} pending status updated to: ${hasPending}`);
        } catch (error: any) {
            const handledError = DatabaseErrorHandler.handleError(error, 'updatePendingRequestStatus');
            ErrorLogger.logError(handledError, {
                operation: 'updatePendingRequestStatus',
                propertyId: propertyDocId,
                additionalData: { hasPending }
            });
            throw handledError;
        }
    }

    /**
     * Find a property by its QR code UUID with comprehensive error handling
     * @param qrCodeUUID The UUID from the scanned QR code
     * @returns The property if found, null otherwise
     */
    static async findByQRCodeUUID(qrCodeUUID: string): Promise<Property | null> {
        try {
            // Input validation with sanitization
            const uuidValidation = ValidationUtils.validateQRCodeUUID(qrCodeUUID);
            if (!uuidValidation.isValid) {
                const error = new Error(uuidValidation.error);
                ErrorLogger.logError(error, {
                    operation: 'findByQRCodeUUID',
                    additionalData: { qrCodeUUID }
                });
                throw PropertyLookupErrorHandler.handleError(error);
            }

            const propertiesRef = collection(db, 'properties');

            // Construct the URL if it's not already one
            const rawUuid = qrCodeUUID.trim();
            const url = rawUuid.includes('doorbell.guestregistration.com')
                ? rawUuid
                : `https://doorbell.guestregistration.com/${rawUuid}`;

            // Search for *either* the UUID or the URL to be safe/backward compatible
            // If the DB has just UUID, we find it. If it has URL, we find it.
            // Note: If rawUuid is already a URL, the array will have duplicates, which is fine.
            const searchValues = [rawUuid];
            if (rawUuid !== url) {
                searchValues.push(url);
            }

            // Execute query with retry logic for network resilience
            const querySnapshot: QuerySnapshot<DocumentData> = await RetryUtils.withRetry(
                () => {
                    const q = query(propertiesRef, where('qrCodeUUID', 'in', searchValues));
                    return getDocs(q);
                },
                {
                    maxAttempts: 3,
                    baseDelay: 1000,
                    retryCondition: (error) => {
                        // Retry on network errors but not on permission/validation errors
                        return error.code === 'unavailable' || 
                               error.code === 'deadline-exceeded' ||
                               error.message?.includes('network');
                    }
                }
            );

            if (querySnapshot.empty) {
                console.log(`No property found for QR code UUID: ${qrCodeUUID}`);
                return null;
            }

            // Get the first matching document
            const doc = querySnapshot.docs[0];
            const data = doc.data();

            // Ensure the Firestore document ID is always included
            const property = {
                ...data,
                id: doc.id, // Firestore document ID - critical for collection paths
            } as Property;

            // Validate that we have the essential fields
            if (!property.id) {
                const error = new Error('Property missing Firestore document ID');
                ErrorLogger.logError(error, {
                    operation: 'findByQRCodeUUID',
                    additionalData: { qrCodeUUID, propertyData: data }
                });
                throw PropertyLookupErrorHandler.handleError(error);
            }

            // Additional validation for critical fields with sanitization
            if (!property.userId) {
                console.warn(`Property ${property.id} missing userId - requests may not be visible to owner`);
            } else {
                const userIdValidation = ValidationUtils.validateUserId(property.userId);
                if (!userIdValidation.isValid) {
                    console.warn(`Property ${property.id} has invalid userId format: ${userIdValidation.error}`);
                }
            }

            if (!property.propertyName) {
                console.warn(`Property ${property.id} missing propertyName - using fallback`);
            } else {
                // Sanitize property name to prevent potential issues
                property.propertyName = ValidationUtils.sanitizeString(property.propertyName);
            }

            // Validate and sanitize other string fields
            if (property.address) {
                property.address = ValidationUtils.sanitizeString(property.address);
            }

            console.log(`Successfully found property ${property.id} for QR code UUID: ${qrCodeUUID}`);
            return property;
        } catch (error: any) {
            // If it's already a handled error, re-throw it
            if (error.name === 'VideoRequestError') {
                throw error;
            }

            // Handle and log the error
            const handledError = PropertyLookupErrorHandler.handleError(error);
            ErrorLogger.logError(handledError, {
                operation: 'findByQRCodeUUID',
                additionalData: { qrCodeUUID }
            });
            throw handledError;
        }
    }
}
