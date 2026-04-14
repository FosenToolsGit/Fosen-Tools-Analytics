export type TaggableEntity = "keyword" | "post" | "campaign" | "source";

export interface Tag {
  id: string;
  name: string;
  color: string;
  description: string | null;
  created_at: string;
}

export interface TagAssignment {
  id: string;
  tag_id: string;
  entity_type: TaggableEntity;
  entity_key: string;
  created_at: string;
}

export interface TagAssignmentWithTag extends TagAssignment {
  tag: Tag;
}

export function keywordEntityKey(query: string): string {
  return query.trim().toLowerCase();
}

export function postEntityKey(platform: string, platformPostId: string): string {
  return `${platform}:${platformPostId}`;
}

export function campaignEntityKey(
  campaignName: string,
  adGroup: string | null,
  keyword: string | null
): string {
  return `${campaignName}|${adGroup ?? ""}|${keyword ?? ""}`;
}

export function sourceEntityKey(
  channel: string,
  source: string | null,
  medium: string | null
): string {
  return `${channel}|${source ?? ""}|${medium ?? ""}`;
}
