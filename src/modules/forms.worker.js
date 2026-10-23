// Builds formations off the main thread, so the intro never stutters while the rest are made.
// Requests are answered in the order they arrive; the arrays are transferred, not copied.
import { buildForm } from './forms.js';

self.onmessage = ({ data: { name, n, params } }) => {
  const f = buildForm(name, n, params);
  self.postMessage({ name, ...f }, [f.pos.buffer, f.aux.buffer]);
};
