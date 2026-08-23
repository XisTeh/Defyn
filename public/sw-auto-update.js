const defynWorkerScope = globalThis;
const defynIsUpdatingExistingWorker = Boolean(defynWorkerScope.registration.active);

defynWorkerScope.addEventListener('activate', (event) => {
  if (!defynIsUpdatingExistingWorker) return;
  event.waitUntil((async () => {
    await defynWorkerScope.clients.claim();
    const windows = await defynWorkerScope.clients.matchAll({ type: 'window', includeUncontrolled: true });
    windows.forEach((client) => client.postMessage({ type: 'DEFYN_UPDATE_READY' }));
  })());
});
