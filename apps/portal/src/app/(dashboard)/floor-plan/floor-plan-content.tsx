'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import type { Id } from '@restaurantos/backend/dataModel';
import { useTenant } from '@/hooks/use-tenant';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
  Badge,
  Separator,
} from '@restaurantos/ui';
import { Plus, Save, Grid3X3, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRID_SIZE = 20;

const SECTIONS = ['main', 'patio', 'bar', 'private'] as const;

const STATUS_COLORS: Record<string, string> = {
  open: '#22c55e',
  reserved: '#eab308',
  occupied: '#ef4444',
  closing: '#9ca3af',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Available',
  reserved: 'Reserved',
  occupied: 'Occupied',
  closing: 'Inactive',
};

interface TableData {
  _id: string;
  name: string;
  seats?: number;
  section?: string;
  status: string;
  posX?: number;
  posY?: number;
  width?: number;
  height?: number;
  shape?: string;
  rotation?: number;
  floor?: string;
}

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export default function FloorPlanContent() {
  const { tenantId } = useTenant();
  const tables = useQuery(
    api.orders.queries.getTables,
    tenantId ? { tenantId } : 'skip'
  ) as TableData[] | undefined;

  const createTable = useMutation(api.orders.mutations.createTable);
  const bulkUpdate = useMutation(api.tables.mutations.bulkUpdateTablePositions);
  const updateSection = useMutation(api.tables.mutations.updateTableSection);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    tableId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [localPositions, setLocalPositions] = useState<
    Record<string, { posX: number; posY: number }>
  >({});
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Properties panel state
  const [editName, setEditName] = useState('');
  const [editCapacity, setEditCapacity] = useState('');
  const [editShape, setEditShape] = useState<string>('square');
  const [editWidth, setEditWidth] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editSection, setEditSection] = useState('main');

  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedTable = tables?.find((t) => t._id === selectedId);

  // Sync properties panel when selection changes
  useEffect(() => {
    if (selectedTable) {
      setEditName(selectedTable.name);
      setEditCapacity(String(selectedTable.seats ?? ''));
      setEditShape(selectedTable.shape === 'round' ? 'circle' : selectedTable.shape ?? 'square');
      setEditWidth(String(selectedTable.width ?? 80));
      setEditHeight(String(selectedTable.height ?? 80));
      setEditSection(selectedTable.section ?? 'main');
    }
  }, [selectedTable]);

  function getTablePos(table: TableData): { posX: number; posY: number } {
    const local = localPositions[table._id];
    if (local) {
      return local;
    }
    return { posX: table.posX ?? 100, posY: table.posY ?? 100 };
  }

  function getTableDimensions(table: TableData) {
    const w = table.width ?? 80;
    const h = table.height ?? 80;
    return { width: w, height: h };
  }

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, tableId: string) => {
      e.stopPropagation();
      const table = tables?.find((t) => t._id === tableId);
      if (!table || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const pos = getTablePos(table);
      const mouseX = (e.clientX - rect.left) / zoom;
      const mouseY = (e.clientY - rect.top) / zoom;

      setSelectedId(tableId);
      setDragState({
        tableId,
        offsetX: mouseX - pos.posX,
        offsetY: mouseY - pos.posY,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tables, zoom, localPositions]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / zoom;
      const mouseY = (e.clientY - rect.top) / zoom;

      const table = tables?.find((t) => t._id === dragState.tableId);
      if (!table) return;
      const dims = getTableDimensions(table);

      let newX = mouseX - dragState.offsetX;
      let newY = mouseY - dragState.offsetY;

      // Snap to grid
      newX = snapToGrid(newX);
      newY = snapToGrid(newY);

      // Clamp to canvas bounds
      newX = Math.max(0, Math.min(CANVAS_WIDTH - dims.width, newX));
      newY = Math.max(0, Math.min(CANVAS_HEIGHT - dims.height, newY));

      setLocalPositions((prev) => ({
        ...prev,
        [dragState.tableId]: { posX: newX, posY: newY },
      }));
      setHasUnsavedChanges(true);
    },
    [dragState, tables, zoom]
  );

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedId(null);
    }
  }, []);

  async function handleAddTable() {
    if (!tenantId) return;

    const existingCount = tables?.length ?? 0;
    const newName = `Table ${existingCount + 1}`;

    try {
      const id = await createTable({
        tenantId,
        name: newName,
        seats: 4,
        section: 'main',
        posX: snapToGrid(CANVAS_WIDTH / 2 - 40),
        posY: snapToGrid(CANVAS_HEIGHT / 2 - 40),
        shape: 'square',
      });
      setSelectedId(id);
      toast.success(`${newName} added`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add table');
    }
  }

  async function handleSaveLayout() {
    if (!tables) return;

    const updates = tables.map((table) => {
      const pos = getTablePos(table);
      return {
        tableId: table._id as Id<'tables'>,
        posX: pos.posX,
        posY: pos.posY,
        width: table.width,
        height: table.height,
        shape: (table.shape === 'round' ? 'circle' : table.shape) as
          | 'circle'
          | 'square'
          | 'rectangle'
          | undefined,
        rotation: table.rotation,
      };
    });

    try {
      await bulkUpdate({ tables: updates });
      setLocalPositions({});
      setHasUnsavedChanges(false);
      toast.success('Floor plan layout saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save layout');
    }
  }

  async function handleUpdateProperties() {
    if (!selectedTable || !tenantId) return;

    try {
      // Update section
      if (editSection !== (selectedTable.section ?? 'main')) {
        await updateSection({
          tableId: selectedTable._id as Id<'tables'>,
          section: editSection,
        });
      }

      // Update position data (includes dimensions and shape) via bulk update
      const pos = getTablePos(selectedTable);
      const shape = editShape as 'circle' | 'square' | 'rectangle';
      const width = parseInt(editWidth) || 80;
      const height = parseInt(editHeight) || 80;

      await bulkUpdate({
        tables: [
          {
            tableId: selectedTable._id as Id<'tables'>,
            posX: pos.posX,
            posY: pos.posY,
            width,
            height,
            shape,
          },
        ],
      });

      toast.success('Table properties updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update properties');
    }
  }

  if (!tenantId) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Floor Plan</h1>
          <p className="text-muted-foreground">
            {tables?.length ?? 0} tables configured
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowGrid(!showGrid)}>
            <Grid3X3 className="mr-1.5 h-3.5 w-3.5" />
            {showGrid ? 'Hide Grid' : 'Show Grid'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="flex items-center text-sm text-muted-foreground px-1">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" onClick={handleAddTable}>
            <Plus className="mr-2 h-4 w-4" />
            Add Table
          </Button>
          <Button onClick={handleSaveLayout} disabled={!hasUnsavedChanges}>
            <Save className="mr-2 h-4 w-4" />
            Save Layout
          </Button>
        </div>
      </div>

      {/* Status legend */}
      <div className="flex gap-4">
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5 text-sm">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[status] }}
            />
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Canvas area */}
        <Card className="flex-1 overflow-auto">
          <CardContent className="p-4">
            <div
              ref={canvasRef}
              className="relative border border-border rounded-lg overflow-hidden cursor-crosshair"
              style={{
                width: CANVAS_WIDTH * zoom,
                height: CANVAS_HEIGHT * zoom,
                minWidth: CANVAS_WIDTH * zoom,
                minHeight: CANVAS_HEIGHT * zoom,
              }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={handleCanvasClick}
            >
              {/* Grid */}
              {showGrid && (
                <svg
                  className="absolute inset-0 pointer-events-none"
                  width={CANVAS_WIDTH * zoom}
                  height={CANVAS_HEIGHT * zoom}
                >
                  <defs>
                    <pattern
                      id="grid"
                      width={GRID_SIZE * zoom}
                      height={GRID_SIZE * zoom}
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d={`M ${GRID_SIZE * zoom} 0 L 0 0 0 ${GRID_SIZE * zoom}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="0.5"
                        className="text-border/40"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              )}

              {/* Tables */}
              {tables?.map((table) => {
                const pos = getTablePos(table);
                const dims = getTableDimensions(table);
                const isSelected = table._id === selectedId;
                const isDragging = dragState?.tableId === table._id;
                const shape = table.shape === 'round' ? 'circle' : table.shape ?? 'square';
                const statusColor = STATUS_COLORS[table.status] ?? STATUS_COLORS.closing;

                return (
                  <div
                    key={table._id}
                    className="absolute flex flex-col items-center justify-center select-none"
                    style={{
                      left: pos.posX * zoom,
                      top: pos.posY * zoom,
                      width: dims.width * zoom,
                      height: dims.height * zoom,
                      borderRadius: shape === 'circle' ? '50%' : '8px',
                      backgroundColor: statusColor,
                      border: isSelected
                        ? '3px solid hsl(var(--primary))'
                        : '2px solid rgba(0,0,0,0.15)',
                      cursor: isDragging ? 'grabbing' : 'grab',
                      zIndex: isDragging ? 50 : isSelected ? 40 : 10,
                      boxShadow: isSelected
                        ? '0 0 0 2px hsl(var(--primary) / 0.3)'
                        : isDragging
                          ? '0 4px 12px rgba(0,0,0,0.2)'
                          : '0 1px 3px rgba(0,0,0,0.1)',
                      transition: isDragging ? 'none' : 'box-shadow 0.15s',
                      transform: table.rotation ? `rotate(${table.rotation}deg)` : undefined,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, table._id)}
                  >
                    <span
                      className="text-white font-bold text-xs leading-tight text-center pointer-events-none"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                    >
                      {table.name}
                    </span>
                    <span
                      className="text-white/80 text-[10px] leading-tight pointer-events-none"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                    >
                      {table.seats ?? '?'} seats
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Properties panel */}
        {selectedTable ? (
          <Card className="w-72 shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Table Properties</CardTitle>
              <CardDescription>{selectedTable.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="table-name">Name</Label>
                <Input
                  id="table-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="table-capacity">Capacity (seats)</Label>
                <Input
                  id="table-capacity"
                  type="number"
                  min="1"
                  max="50"
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Shape</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['circle', 'square', 'rectangle'] as const).map((s) => (
                    <Button
                      key={s}
                      variant={editShape === s ? 'default' : 'outline'}
                      size="sm"
                      className="capitalize"
                      onClick={() => setEditShape(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
              {(editShape === 'rectangle' || editShape === 'square') && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="table-width">Width</Label>
                    <Input
                      id="table-width"
                      type="number"
                      min="40"
                      max="200"
                      step="20"
                      value={editWidth}
                      onChange={(e) => setEditWidth(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="table-height">Height</Label>
                    <Input
                      id="table-height"
                      type="number"
                      min="40"
                      max="200"
                      step="20"
                      value={editHeight}
                      onChange={(e) => setEditHeight(e.target.value)}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="table-section">Section</Label>
                <select
                  id="table-section"
                  value={editSection}
                  onChange={(e) => setEditSection(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {SECTIONS.map((s) => (
                    <option key={s} value={s} className="capitalize">
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <Separator />

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge
                  style={{
                    backgroundColor: STATUS_COLORS[selectedTable.status],
                    color: '#fff',
                  }}
                >
                  {STATUS_LABELS[selectedTable.status] ?? selectedTable.status}
                </Badge>
              </div>

              <div className="text-xs text-muted-foreground">
                Position: ({Math.round(getTablePos(selectedTable).posX)},{' '}
                {Math.round(getTablePos(selectedTable).posY)})
              </div>

              <Separator />

              <Button className="w-full" onClick={handleUpdateProperties}>
                <Save className="mr-2 h-4 w-4" />
                Update Properties
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-72 shrink-0">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Grid3X3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Click a table to view and edit its properties
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Drag tables to reposition them on the floor plan
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
