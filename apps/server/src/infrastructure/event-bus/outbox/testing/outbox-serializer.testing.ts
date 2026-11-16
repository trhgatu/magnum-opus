import type {
  OutboxPublication,
  OutboxSerializer,
} from '../outbox-publication';
import { OutboxRegistry } from '../outbox-registry';
import { OutboxPublisher } from '../outbox.decorators';

// Serializer thật cho spec repository: nạp đúng publication của các class
// @OutboxPublisher truyền vào, nên spec kiểm được chuỗi type thật trong DB.
export const outboxSerializerFor = (
  ...publishers: object[]
): OutboxSerializer => {
  const registry = new OutboxRegistry({} as never);
  const publications = publishers.flatMap(
    (publisher) =>
      Reflect.getMetadata(
        OutboxPublisher.KEY,
        publisher,
      ) as OutboxPublication[],
  );
  registry.register(
    publications,
    publications.map(({ as }) => ({
      event: as,
      handler: { handle: () => Promise.resolve() },
    })),
  );
  return registry;
};
