import Image, { type ImageProps } from "next/image";

/**
 * Imagem com qualidade alta por padrão (90). As fotos dos trajes são o
 * produto: compressão agressiva deixa o tecido "borrado".
 */
export function SadyImage({ quality = 90, alt, ...props }: ImageProps) {
  return <Image quality={quality} alt={alt} {...props} />;
}

export default SadyImage;
