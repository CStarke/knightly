import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ModalDialog, ModalHeader } from '@/components/ui/modal-dialog';
import { Brand, Spacing } from '@/constants/theme';

export interface LocationInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Modal dialog displaying guidance and formatting tips for event locations.
 */
export function LocationInfoModal({ visible, onClose }: LocationInfoModalProps) {
  return (
    <ModalDialog visible={visible} onClose={onClose}>
      <ModalHeader
        title="Location Guide"
        icon={{ sf: 'mappin.and.ellipse', md: 'place', color: Brand.gold }}
        onClose={onClose}
      />
      <View style={styles.infoModalBody}>
        <View style={styles.infoRow}>
          <View style={styles.infoIconWrapper}>
            <Icon sf="checkmark.circle.fill" md="check_circle" size={14} color={Brand.gold} />
          </View>
          <ThemedText style={styles.infoText}>
            <Text style={styles.infoBold}>Optional field.</Text> Leave blank if your event or announcement is online, location-independent, or TBA.
          </ThemedText>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIconWrapper}>
            <Icon sf="mappin.circle" md="room" size={14} color={Brand.gold} />
          </View>
          <ThemedText style={styles.infoText}>
            <Text style={styles.infoBold}>Campus or off-campus:</Text> Specify a room number, building, lawn, or address (e.g. <Text style={styles.infoItalic}>"Commons Lawn"</Text>, <Text style={styles.infoItalic}>"CFAC 222"</Text>, or <Text style={styles.infoItalic}>"Downtown Grand Rapids"</Text>).
          </ThemedText>
        </View>

        <View style={styles.infoModalFooter}>
          <Button
            label="Got it"
            variant="gold"
            size="regular"
            onPress={onClose}
          />
        </View>
      </View>
    </ModalDialog>
  );
}

const styles = StyleSheet.create({
  infoModalBody: {
    padding: Spacing.three,
    gap: Spacing.two + 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  infoIconWrapper: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: false,
  },
  infoBold: {
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: false,
  },
  infoItalic: {
    fontStyle: 'italic',
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: false,
    color: Brand.gold,
  },
  infoModalFooter: {
    marginTop: Spacing.one,
  },
});
