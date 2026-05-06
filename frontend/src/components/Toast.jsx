// Stateless toast renderer. Lifecycle (auto-dismiss) is owned by the caller —
// this component just renders the current message + variant.

export function Toast({ message, type }) {
  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-content">{message}</div>
    </div>
  );
}
