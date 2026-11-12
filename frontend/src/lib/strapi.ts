const STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL || "http://127.0.0.1:1337";

// JWT пользователя Strapi (добавляется к запросам, если есть)
function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("ampligame_jwt");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchFromStrapi(endpoint: string) {
  const query = endpoint.includes("?") ? "" : "?populate=*";
  const url = `${STRAPI_URL}/api/${endpoint}${query}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Ошибка Strapi: ${res.status}`);
  const json = await res.json();
  return json.data;
}

// Загрузка одной записи по documentId
export async function fetchOneFromStrapi(endpoint: string) {
  const url = `${STRAPI_URL}/api/${endpoint}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Ошибка Strapi: ${res.status}`);
  const json = await res.json();
  return json.data;
}

// Создание записи (POST). При ошибке пробрасываем понятное сообщение.
export async function postToStrapi(endpoint: string, data: unknown) {
  const url = `${STRAPI_URL}/api/${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ data }),
    cache: "no-store",
  });
  if (!res.ok) {
    let message = `Ошибка Strapi: ${res.status}`;
    try {
      const err = await res.json();
      message = err?.error?.message || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const json = await res.json();
  return json.data;
}

export async function fetchGames() {
  const result = await fetchFromStrapi("games");
  return Array.isArray(result) ? result : [];
}

export async function fetchGameById(id: string) {
  return await fetchFromStrapi(`games/${id}`);
}

export async function fetchForumCategories() {
  const result = await fetchFromStrapi("forum-categories");
  return Array.isArray(result) ? result : [];
}

export async function fetchPopularTopics() {
  const result = await fetchFromStrapi("popular-topics");
  return Array.isArray(result) ? result : [];
}

export async function fetchEvents() {
  const result = await fetchFromStrapi("events");
  return Array.isArray(result) ? result : [];
}

export async function fetchFaqs() {
  const result = await fetchFromStrapi("faqs");
  return Array.isArray(result) ? result : [];
}

export async function fetchContacts() {
  const result = await fetchFromStrapi("contacts");
  return Array.isArray(result) ? result : [];
}

export async function fetchUsefulLinks() {
  const result = await fetchFromStrapi("useful-links");
  return Array.isArray(result) ? result : [];
}

export async function fetchTariffs() {
  const result = await fetchFromStrapi("tariffs");
  return Array.isArray(result) ? result : [];
}

export async function fetchStreams() {
  const result = await fetchFromStrapi("streams");
  return Array.isArray(result) ? result : [];
}

export async function fetchCybersportNews() {
  const result = await fetchFromStrapi("cybersport-news-items");
  return Array.isArray(result) ? result : [];
}

// Группы теперь берутся из отдельной коллекции groups
export async function fetchGroups() {
  const result = await fetchFromStrapi("groups");
  return Array.isArray(result) ? result : [];
}

export async function createGroup(payload: {
  Title: string;
  Description: string;
  Members?: number;
  Posts?: number;
  Color?: string;
}) {
  return postToStrapi("groups", payload);
}

// Системные требования для страницы поддержки
export async function fetchRequirements() {
  const result = await fetchFromStrapi("requirements");
  return Array.isArray(result) ? result : [];
}

// Баннеры для карусели на главной
export async function fetchBanners() {
  const result = await fetchFromStrapi("banners");
  return Array.isArray(result) ? result : [];
}

/* ===== Форумы: темы и сообщения ===== */

export interface ForumTopicItem {
  id: string;
  Title: string;
  Content?: string;
  Author?: string;
  Views?: number;
  MessagesCount?: number;
  Category?: { documentId?: string; category_title?: string } | null;
  createdAt?: string;
  Posts?: ForumPostItem[];
}

export interface ForumPostItem {
  id: string;
  Message: string;
  Author?: string;
  createdAt?: string;
}

export async function fetchForumTopics() {
  const result = await fetchFromStrapi(
    "forum-topics?sort=createdAt:desc&populate[Category][fields][0]=category_title"
  );
  // documentId использую как id для навигации (в Strapi 5 API принимает documentId)
  return Array.isArray(result)
    ? result.map((r: any) => ({ ...r, id: r.documentId || r.id }))
    : [];
}

export async function fetchForumTopicById(id: string): Promise<ForumTopicItem | null> {
  try {
    return await fetchOneFromStrapi(`forum-topics/${id}`);
  } catch {
    return null;
  }
}

export async function fetchForumPosts(topicId: string): Promise<ForumPostItem[]> {
  const result = await fetchFromStrapi(
    `forum-posts?filters[Topic][documentId][$eq]=${encodeURIComponent(topicId)}&sort=createdAt:asc`
  );
  return Array.isArray(result)
    ? result.map((r: any) => ({ ...r, id: r.documentId || r.id }))
    : [];
}

export async function createForumTopic(payload: {
  Title: string;
  Content: string;
  Author: string;
  Category?: string;
}) {
  return postToStrapi("forum-topics", payload);
}

export async function createForumPost(payload: {
  Message: string;
  Author: string;
  Topic: string;
}) {
  return postToStrapi("forum-posts", payload);
}

/* ===== Поддержка: тикеты ===== */

export interface SupportTicketItem {
  id: string;
  TicketNumber?: string;
  Subject: string;
  Category?: string;
  Priority?: string;
  Status?: string;
  Message: string;
  ContactEmail?: string;
  Response?: string | null;
  ResponseDate?: string | null;
  createdAt?: string;
}

export async function fetchSupportTickets(email?: string) {
  const query = email
    ? `support-tickets?filters[ContactEmail][$eq]=${encodeURIComponent(email)}&sort=createdAt:desc`
    : "support-tickets?sort=createdAt:desc";
  const result = await fetchFromStrapi(query);
  return Array.isArray(result)
    ? result.map((r: any) => ({ ...r, id: r.documentId || r.id }))
    : [];
}

export async function fetchSupportTicketById(id: string): Promise<SupportTicketItem | null> {
  try {
    return await fetchOneFromStrapi(`support-tickets/${id}`);
  } catch {
    return null;
  }
}

export async function createSupportTicket(payload: {
  Subject: string;
  Category: string;
  Priority: string;
  Message: string;
  ContactEmail: string;
  Status?: string;
  TicketNumber?: string;
}) {
  return postToStrapi("support-tickets", payload);
}
