const defynWorkerScope = globalThis;
const defynIsUpdatingExistingWorker = Boolean(defynWorkerScope.registration.active);

defynWorkerScope.addEventListener('activate', (event) => {
  if (!defynIsUpdatingExistingWorker) return;
  event.waitUntil((async () => {
    await defynWorkerScope.clients.claim();
    const windows = await defynWorkerScope.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.allSettled(windows.map((client) => client.navigate(client.url)));
  })());
});
