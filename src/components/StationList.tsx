import type { SenseBox } from '../api/types'

type StationListProps = {
  boxes: SenseBox[]
  selectedBoxId?: string
  onSelect: (boxId: string) => void
}

export function StationList({ boxes, selectedBoxId, onSelect }: StationListProps) {
  if (boxes.length === 0) {
    return <p className="muted">Keine Stationen in der aktuellen Ansicht.</p>
  }

  const sorted = [...boxes].sort((a, b) => {
    const aTime = a.lastMeasurementAt ? Date.parse(a.lastMeasurementAt) : 0
    const bTime = b.lastMeasurementAt ? Date.parse(b.lastMeasurementAt) : 0
    return bTime - aTime
  })

  return (
    <ul className="station-list">
      {sorted.slice(0, 40).map((box) => (
        <li key={box._id}>
          <button
            type="button"
            className={selectedBoxId === box._id ? 'active' : undefined}
            onClick={() => onSelect(box._id)}
          >
            <div>{box.name}</div>
            <div className="station-meta">
              {(box.exposure || 'unknown').toLowerCase()}
              {box.lastMeasurementAt
                ? ` · ${new Date(box.lastMeasurementAt).toLocaleString('de-DE')}`
                : ' · keine Messung'}
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}
