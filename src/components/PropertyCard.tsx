import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Body, MediumText, SmallText } from '@/typography';
import { colors } from '@/styles/colors';
import { ChevronRight } from 'lucide-react-native';
import { type Property } from '@/types';
import { useNavigation } from '@react-navigation/native';

interface PropertyCardProps {
  property: Property;
}

const ActiveBadge = () => (
  <View style={styles.activeBadge}>
    <SmallText variant='primary'>Active</SmallText>
  </View>
);

const LockStatusDot = () => <View style={styles.lockStatusDot} />;

export const PropertyCard = ({ property }: PropertyCardProps) => {
  const navigation = useNavigation();

  const handlePress = () => {
  navigation.navigate('PropertyDetails', { propertyId: property.propertyId })
}

  return (
    <View style={styles.container}>
      <View style={[styles.flexRowCenter, styles.topSection]}>
        <View>
          <Body weight="bolder" variant="black">
            {property?.propertyName}
          </Body>
          <MediumText style={styles.addressText}>{property.address}</MediumText>
        </View>
        <TouchableOpacity onPress={handlePress}>
          <ChevronRight size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statusSection}>
        <View style={styles.flexRowCenter}>
          <Body weight="bold">Property Status</Body>
          <ActiveBadge />
        </View>

        <View style={[styles.flexRowCenter, styles.statusRow]}>
          <Body weight="bold">Smart Lock(s) Status</Body>
          <View style={styles.lockStatusContainer}>
            <LockStatusDot />
            <LockStatusDot />
            <LockStatusDot />
          </View>
        </View>

        <View style={[styles.flexRowCenter, styles.statusRow]}>
          <Body weight="normal">Requests</Body>
          <SmallText style={styles.request}>0</SmallText>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.white,
    marginVertical: 8
  },
  flexRowCenter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  topSection: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopRightRadius: 10,
    borderTopLeftRadius: 10,
  },
  addressText: {
    color: colors.textSecondary,
    marginTop: 2,
  },

  statusSection: {
    padding: 12,
    borderWidth: 1,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopWidth: 0,
    borderColor: colors.border,
  },
  statusRow: {
    marginTop: 8,
  },
  activeBadge: {
    backgroundColor: colors.activeTagBg,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 15,
  },

  lockStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.active,
    marginLeft: 4,
  },
  request: {
    backgroundColor: colors.tagBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999
  }
})
