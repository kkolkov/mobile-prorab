export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
export function createRequest(base: string, transport: typeof fetch = fetch, timeoutMs = 120000, headers:()=>Promise<Record<string,string>> = async()=>({}), unauthorized:()=>Promise<void> = async()=>{}) {
  return async function request<T>(path: string, body?: unknown, method = 'POST'): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const extraHeaders=await headers();
      const response = await transport(base + path, {
        method: body === undefined && method === 'POST' ? 'GET' : method,
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: controller.signal,
      });
      const raw = await response.text();
      let data;
      try { data = raw ? JSON.parse(raw) : null; } catch { throw new ApiError('Сервер вернул некорректный ответ. Повторите запрос.', response.status); }
      if(response.status===401&&!path.startsWith('/auth/'))await unauthorized();
      if (!response.ok) throw new ApiError(data?.message || 'Не удалось выполнить запрос', response.status);
      return data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(controller.signal.aborted
        ? 'Сервер не ответил за две минуты. Ваш ввод остался в форме. Попробуйте ещё раз чуть позже.'
        : 'Не удалось связаться с сервером. Ваш ввод остался в форме. Проверьте подключение к интернету или попробуйте другую сеть.', 0);
    } finally { clearTimeout(timer); }
  };
}
