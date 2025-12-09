# Web Version Documentation

This directory contains the dedicated web version of the Doorbell App.

## Structure

- **AppWeb.tsx**: The root component for the web version.
- **navigation/**: Contains the web-specific navigation configuration (URL routing).
- **screens/**:
  - `WebScannerScreen`: The landing page displaying the QR Code scanner.
  - `WebGuestScreen`: The "Ring Doorbell" feature page for guests.
- **index.web.tsx**: The entry point at the project root that bootstraps this web app.

## Running the Web App

To run the web version locally:

```bash
npx expo start --web
```

## Features

1.  **QR Code Scanner**: The app starts with a QR code scanner (Entry Point).
2.  **Ring Doorbell**: A dedicated guest interface to ring the doorbell and record a message.

## Dependencies

This web build utilizes:
- `expo-camera` for scanning and recording simulation.
- `react-native-web` for rendering React Native components on the web.
- `lucide-react-native` for icons.
