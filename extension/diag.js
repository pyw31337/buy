/* 진단 기록: 메일 내용·개인정보는 남기지 않고 단계·상태·개수만 기록 */
function diag(step, ok, info) {
  const e = { t: new Date().toISOString(), step, ok, info: String(info || '').slice(0, 200), v: chrome.runtime.getManifest().version, where: location.host };
  chrome.storage.local.get('diag', d => { const a = (d.diag || []).slice(-199); a.push(e); chrome.storage.local.set({ diag: a }); });
}
