import { Image } from 'react-native';

/** Keep identical star geometry across platforms, with a genuinely solid saved state. */
export function FavoriteStar({ saved, color, size = 16 }: { saved: boolean; color: string; size?: number }) {
  // Bundled alpha masks avoid symbol-font fill limitations and SVG data-URI decoding.
  return <Image
    source={saved ? require('@/assets/icons/favorite-star-filled.png') : require('@/assets/icons/favorite-star-outline.png')}
    style={{ width: size, height: size, tintColor: color }}
    resizeMode="contain"
    accessible={false}
    fadeDuration={0}
  />;
}
