import {authHeaders,clearSession} from './auth/storage.js';
const BASE = window.PRORAB_API_BASE || 'http://localhost:8080/api';

export async function request(url, options = {}) {
  const response = await fetch(BASE + url, {
    ...options,
    headers: {'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {})}
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {if(response.status===401&&!url.startsWith('/auth/')){clearSession();window.dispatchEvent(new Event('prorab:unauthorized'));}const error=new Error(data?.message || 'Ошибка запроса');error.status=response.status;throw error;}
  return data;
}

export const api = {
  list: () => request('/projects'),
  me: () => request('/auth/me'),
  login: (body,register=false) => request(`/auth/${register?'register':'login'}`, {method:'POST',body:JSON.stringify(body)}),
  logout: () => request('/auth/logout',{method:'POST'}),
  access: () => request('/projects/access', {}),
  accessAction: (action, body={}) => request(`/projects/access/${action}`, {method:'POST',body:JSON.stringify(body)}),
  createDraft: body => request('/projects/draft', {method: 'POST',  body: JSON.stringify(body)}),
  get: id => request(`/projects/${id}`),
  step: (id, n, body) => request(`/projects/${id}/steps/${n}`, {method: 'PUT', body: JSON.stringify(body)}),
  saveStepAndEstimate: (id, body) => request(`/projects/${id}/steps/5/estimate`, {method: 'PUT', body: JSON.stringify(body)}),
  estimate: (id, version) => request(`/projects/${id}/estimate?version=${version}`, {method: 'POST'}),
  activate: (id, version) => request(`/projects/${id}/activate?version=${version}`, {method: 'POST'})
};
