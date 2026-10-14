import { useEffect } from 'react';

export default function Toast({ message, kind, onDone }) {
  useEffect(() => {
    const id = setTimeout(onDone, 3500);
    return () => clearTimeout(id);
  }, [onDone]);
  return <div className={`toast toast-${kind}`} role="status">{message}</div>;
}
