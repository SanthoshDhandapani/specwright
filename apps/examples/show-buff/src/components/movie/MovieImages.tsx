import type { ShowImage } from '../../types/movie';

interface Props {
  images: ShowImage[];
}

export function MovieImages({ images }: Props) {
  const gallery = images.slice(0, 8);

  if (gallery.length === 0) return null;

  return (
    <div data-testid="show-image-gallery">
      <h2 className="mb-4 text-lg font-semibold text-white">Gallery</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {gallery.map((img, i) => (
          <img
            key={img.id}
            src={img.resolutions.original.url}
            alt={`Show image ${i + 1}`}
            data-testid={`show-image-${i}`}
            loading="lazy"
            className="aspect-video w-full rounded-lg object-cover"
          />
        ))}
      </div>
    </div>
  );
}
