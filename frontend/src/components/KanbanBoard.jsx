import { useState } from 'react';
import './KanbanBoard.css';

const COLONNE = [
  { id: 'todo',      label: 'TODO',      colore: 'var(--text3)',  bg: 'rgba(74,90,122,0.12)' },
  { id: 'in_corso',  label: 'IN CORSO',  colore: 'var(--amber)',  bg: 'var(--amber-bg)' },
  { id: 'in_review', label: 'IN REVIEW', colore: 'var(--violet)', bg: 'var(--violet-bg)' },
  { id: 'fatto',     label: 'FATTO',     colore: 'var(--mint)',   bg: 'var(--mint-bg)' },
];

export default function KanbanBoard({ tasks = [], onTaskMoved }) {
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const handleDragStart = (e, taskId) => {
    setDraggingId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, colonnaId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colonnaId) setDragOverCol(colonnaId);
  };

  const handleDrop = (e, colonnaId) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!draggingId) return;
    const task = tasks.find(t => t._id === draggingId);
    if (!task || task.stato === colonnaId) { setDraggingId(null); return; }
    onTaskMoved(draggingId, colonnaId);
    setDraggingId(null);
  };

  if (!tasks.length) {
    return (
      <div className="kb-empty">
        <div className="kb-empty-ico">📋</div>
        <div>Nessun task configurato per questa sala.</div>
        <div style={{ fontSize: 11, marginTop: 4, color: 'var(--text3)' }}>
          L'admin può aggiungere task alla creazione della War Room.
        </div>
      </div>
    );
  }

  return (
    <div className="kanban-board">
      {COLONNE.map(col => {
        const carteColonna = tasks.filter(t => t.stato === col.id);
        const isTarget = dragOverCol === col.id && draggingId !== null;
        return (
          <div
            key={col.id}
            className={`kb-col ${isTarget ? 'kb-col-target' : ''}`}
            onDragOver={e => handleDragOver(e, col.id)}
            onDrop={e => handleDrop(e, col.id)}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverCol(null); }}
          >
            {/* Intestazione colonna */}
            <div className="kb-col-hdr">
              <span className="kb-col-lbl" style={{ color: col.colore }}>{col.label}</span>
              <span className="kb-col-ct" style={{ background: col.bg, color: col.colore }}>
                {carteColonna.length}
              </span>
            </div>

            {/* Carte task */}
            <div className="kb-col-body">
              {carteColonna.map(task => (
                <div
                  key={task._id}
                  className={`kb-card ${draggingId === task._id ? 'kb-card-dragging' : ''}`}
                  draggable
                  onDragStart={e => handleDragStart(e, task._id)}
                  onDragEnd={() => setDraggingId(null)}
                >
                  <div className="kb-card-title">{task.titolo}</div>
                  {task.descrizione && (
                    <div className="kb-card-desc">{task.descrizione}</div>
                  )}
                  <div className="kb-card-footer">
                    {task.assegnatoA?.username ? (
                      <div className="kb-card-user">
                        <div className="kb-card-av" style={{ background: col.colore }}>
                          {task.assegnatoA.username.slice(0, 2).toUpperCase()}
                        </div>
                        <span>{task.assegnatoA.username}</span>
                      </div>
                    ) : (
                      <div className="kb-card-user" style={{ color: 'var(--text3)' }}>
                        — non assegnato
                      </div>
                    )}
                    <span className="kb-card-badge" style={{ background: col.bg, color: col.colore }}>
                      {col.label}
                    </span>
                  </div>
                </div>
              ))}

              {/* Indicatore drop target */}
              {isTarget && (
                <div className="kb-drop-hint">Rilascia qui →</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
