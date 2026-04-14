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
  auto?: boolean;
  rule_id?: string | null;
}

export type RuleMatchMode = "contains" | "equals" | "starts_with" | "regex";

export interface TagRule {
  id: string;
  tag_id: string;
  entity_type: TaggableEntity;
  pattern: string;
  mode: RuleMatchMode;
  case_sensitive: boolean;
  enabled: boolean;
  created_at: string;
}

export function ruleMatches(
  rule: Pick<TagRule, "pattern" | "mode" | "case_sensitive">,
  value: string
): boolean {
  if (!value) return false;
  const haystack = rule.case_sensitive ? value : value.toLowerCase();
  const needle = rule.case_sensitive ? rule.pattern : rule.pattern.toLowerCase();
  switch (rule.mode) {
    case "contains":
      return haystack.includes(needle);
    case "equals":
      return haystack === needle;
    case "starts_with":
      return haystack.startsWith(needle);
    case "regex":
      try {
        return new RegExp(rule.pattern, rule.case_sensitive ? "" : "i").test(value);
      } catch {
        return false;
      }
  }
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
