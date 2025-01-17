import { formatDate } from '$lib/utils/formatters/dateFormatter';

export type Partition = {
  id: number;
  segmentsCount: number;
  currentOffset: number;
  sizeBytes: number;
  messagesCount: number;
  createdAt: string;
};

export function partitionMapper(item: any): Partition {
  return {
    id: item.id,
    segmentsCount: item.segments_count,
    currentOffset: item.current_offset,
    sizeBytes: item.size_bytes,
    messagesCount: item.messages_count,
    createdAt: formatDate(item.created_at)
  };
}
