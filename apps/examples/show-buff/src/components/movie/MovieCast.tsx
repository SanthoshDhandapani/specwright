import type { CastMember } from '../../types/movie';

interface Props {
  cast: CastMember[];
}

export function MovieCast({ cast }: Props) {
  const topCast = cast.slice(0, 12);

  return (
    <div data-testid="cast-list">
      <h2 className="mb-4 text-lg font-semibold text-white">Cast</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {topCast.map((member) => (
          <div
            key={member.person.id}
            data-testid={`cast-member-${member.person.id}`}
            className="overflow-hidden rounded-lg border border-gray-800 bg-gray-900"
          >
            {member.person.image?.medium ? (
              <img
                src={member.person.image.medium}
                alt={member.person.name}
                className="aspect-[2/3] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[2/3] items-center justify-center bg-gray-800 text-2xl text-gray-600">
                👤
              </div>
            )}
            <div className="p-2">
              <p data-testid={`cast-member-name-${member.person.id}`} className="truncate text-xs font-medium text-white">
                {member.person.name}
              </p>
              <p data-testid={`cast-member-character-${member.person.id}`} className="truncate text-xs text-gray-500">
                {member.character.name}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
