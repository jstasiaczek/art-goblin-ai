import { useEffect, useState } from 'react';
import { Alert, Card, Empty, List, Pagination, Space, Typography, Button, Image, Tooltip, Tag, Popconfirm, message, Switch, Checkbox, Grid } from 'antd';
import { useMemo } from 'react';
import { useModels } from '../../state/ModelsContext';
import axios from 'axios';
import { EntryDetailsModal } from './EntryDetailsModal';
import { MoveEntriesModal } from './MoveEntriesModal';
import type { HistoryEntry } from '../../types/history';
import type { ProjectWithGroupName } from '../../types/projects';

type Props = {
    projectUuid: string;
    refreshKey?: number;
    onRestore?: (entry: HistoryEntry) => void;
};

export const ProjectHistory: React.FC<Props> = ({ projectUuid, refreshKey, onRestore }) => {
    const { models } = useModels();
    const screens = Grid.useBreakpoint();
    const modelNameById = useMemo(() => {
        const map: Record<string, string> = {};
        for (const m of models) map[m.id] = m.name;
        return map;
    }, [models]);
    const [items, setItems] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [total, setTotal] = useState<number>(0);
    const [detailsEntry, setDetailsEntry] = useState<HistoryEntry | null>(null);
    const [msgApi, msgCtx] = message.useMessage();
    const [favoritesOnly, setFavoritesOnly] = useState<boolean>(false);
    const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
    const [isMoveModalOpen, setIsMoveModalOpen] = useState<boolean>(false);
    const [availableProjects, setAvailableProjects] = useState<ProjectWithGroupName[]>([]);
    const [loadingProjects, setLoadingProjects] = useState<boolean>(false);
    const [targetProjectUuid, setTargetProjectUuid] = useState<string>('');
    const [movingEntries, setMovingEntries] = useState<boolean>(false);
    const projectOptions = useMemo(
        () => availableProjects
            .filter((project) => project.uuid !== projectUuid)
            .map((project) => ({ value: project.uuid, label:`${project.group_name ?? '—'} / ${project.name}` })),
        [availableProjects, projectUuid],
    );

    useEffect(() => {
        if (isMoveModalOpen && !loadingProjects && !targetProjectUuid && projectOptions.length) {
            setTargetProjectUuid(projectOptions[0].value);
        }
    }, [isMoveModalOpen, loadingProjects, targetProjectUuid, projectOptions]);

    const load = async (p = page, ps = pageSize) => {
        try {
            setLoading(true);
            setError(null);
            const params = { project_uuid: projectUuid, page: p, pageSize: ps, favorite: favoritesOnly ? 'true' : undefined } as any;
            const [metaRes, listRes] = await Promise.all([
                axios.get<{ total: number; page: number; pageSize: number }>(
                    '/api/history/meta',
                    { params },
                ),
                axios.get<HistoryEntry[]>(
                    '/api/history',
                    { params },
                ),
            ]);
            const list = listRes.data || [];
            setTotal(metaRes.data.total || 0);
            setItems(list);
            setSelectedEntries((prev) => {
                const validIds = new Set(list.map((entry) => entry.uuid));
                const next = new Set<string>();
                prev.forEach((id) => {
                    if (validIds.has(id)) next.add(id);
                });
                return next;
            });
        } catch {
            setError('Failed to load history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setPage(1);
        void load(1, pageSize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectUuid, refreshKey, favoritesOnly]);

    const onPaginate = (p: number, ps: number) => {
        setPage(p);
        setPageSize(ps);
        void load(p, ps);
    };

    const toggleSelection = (uuid: string, checked: boolean) => {
        setSelectedEntries((prev) => {
            const next = new Set(prev);
            if (checked) {
                next.add(uuid);
            } else {
                next.delete(uuid);
            }
            return next;
        });
    };

    const clearSelection = () => {
        setSelectedEntries(new Set());
    };

    const selectedCount = selectedEntries.size;

    const loadProjects = async () => {
        try {
            setLoadingProjects(true);
            const res = await axios.get<ProjectWithGroupName[]>('/api/projects');
            const data = Array.isArray(res.data) ? res.data : [];
            setAvailableProjects(data);
        } catch {
            msgApi.error('Failed to load projects');
        } finally {
            setLoadingProjects(false);
        }
    };

    const openMoveModal = async () => {
        setTargetProjectUuid('');
        await loadProjects();
        setIsMoveModalOpen(true);
    };

    const closeMoveModal = () => {
        if (movingEntries) return;
        setIsMoveModalOpen(false);
    };

    const onMoveEntries = async () => {
        const entryUuids = Array.from(selectedEntries);
        if (!entryUuids.length) return;
        if (!targetProjectUuid || !targetProjectUuid.trim()) {
            msgApi.warning('Select a destination project');
            return;
        }
        try {
            setMovingEntries(true);
            await axios.post('/api/history/move', {
                entryUuids,
                targetProjectUuid,
            });
            msgApi.success('Entries moved');
            setIsMoveModalOpen(false);
            clearSelection();
            setTargetProjectUuid('');
            void load();
        } catch (err: any) {
            msgApi.error(err?.response?.data?.error || 'Failed to move entries');
        } finally {
            setMovingEntries(false);
        }
    };

    const formatDate = (d: HistoryEntry['create_date']) => {
        try {
            const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
            if (!date || Number.isNaN(date.getTime())) return String(d);
            return new Intl.DateTimeFormat(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
            }).format(date);
        } catch {
            return String(d);
        }
    };

    return (
        <Card
            title="History"
            extra={
                <Space size={12} wrap>
                    {selectedCount > 0 && (
                        <Typography.Text>Selected: {selectedCount}</Typography.Text>
                    )}
                    <Button
                        onClick={clearSelection}
                        disabled={selectedCount === 0}
                    >
                        Clear selection
                    </Button>
                    <Button
                        type="primary"
                        disabled={selectedCount === 0}
                        onClick={() => void openMoveModal()}
                    >
                        Move to project
                    </Button>
                    <span style={{ color: 'rgba(255,255,255,0.85)' }}>Favorites only</span>
                    <Switch checked={favoritesOnly} onChange={(v) => { setFavoritesOnly(v); }} size="small" />
                    <Button onClick={() => void load()} disabled={loading}>Refresh</Button>
                </Space>
            }
        >
            {msgCtx}
            {error && <Alert type="error" message={error} style={{ marginBottom: 12 }} />}
            <List
                loading={loading}
                dataSource={items}
                rowKey={(item) => item.uuid}
                locale={{ emptyText: <Empty description="No entries" /> }}
                renderItem={(item) => {
                    const checked = selectedEntries.has(item.uuid);
                    return (
                        <List.Item
                            extra={
                                item.image_name ? (
                                    <Image
                                        src={`/api/generated/${item.image_name}`}
                                        width={64}
                                        height={64}
                                        style={{ objectFit: 'cover' }}
                                        alt={item.image_name}
                                        preview={false}
                                    />
                                ) : null
                            }
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%' }}>
                                <Checkbox
                                    checked={checked}
                                    onChange={(event) => toggleSelection(item.uuid, event.target.checked)}
                                />
                                <List.Item.Meta
                                    style={{ flex: 1, minWidth: 0 }}
                                    title={
                                        <Space size={8}>
                                            <Tooltip title={item.model}>
                                                <Typography.Text strong>{modelNameById[item.model] ?? item.model}</Typography.Text>
                                            </Tooltip>
                                            {item.provider && (
                                                <Tag color={item.provider === 'api2' ? 'green' : 'blue'} style={{ marginInlineStart: 0 }}>
                                                    {item.provider.toUpperCase()}
                                                </Tag>
                                            )}
                                            <Typography.Text type="secondary">{item.width}x{item.height}</Typography.Text>
                                        </Space>
                                    }
                                    description={
                                        <>
                                            <Typography.Paragraph style={{ marginBottom: 4 }} ellipsis={{ rows: 2 }}>
                                                {item.prompt}
                                            </Typography.Paragraph>
                                            <Space size={8} wrap>
                                                <Button
                                                    size="small"
                                                    onClick={() => onRestore?.(item)}
                                                    style={!screens.sm ? { width: '100%' } : undefined}
                                                >
                        Restore
                                                </Button>
                                                <Button
                                                    size="small"
                                                    onClick={() => setDetailsEntry(item)}
                                                    style={!screens.sm ? { width: '100%' } : undefined}
                                                >
                        Details
                                                </Button>
                                                <Tooltip title={item.favorite ? 'Remove from favorites' : 'Add to favorites'}>
                                                    <Button
                                                        size="small"
                                                        type="text"
                                                        style={!screens.sm ? { width: '100%' } : undefined}
                                                        onClick={async () => {
                                                            try {
                                                                const desired = !item.favorite;
                                                                const res = await axios.patch(`/api/history/${item.uuid}/favorite`, { favorite: desired });
                                                                const updated = typeof res?.data?.favorite === 'boolean' ? res.data.favorite : desired;
                                                                setItems((prev) => {
                                                                    const arr = prev.map((it) => it.uuid === item.uuid ? { ...it, favorite: updated } : it);
                                                                    return (favoritesOnly && !updated) ? arr.filter((it) => it.uuid !== item.uuid) : arr;
                                                                });
                                                                if (favoritesOnly && !updated) setTotal((t) => Math.max(0, t - 1));
                                                                msgApi.success(updated ? 'Added to favorites' : 'Removed from favorites');
                                                            } catch (e: any) {
                                                                msgApi.error(e?.response?.data?.error || 'Failed to update');
                                                            }
                                                        }}
                                                    >
                                                        <span style={{ fontSize: 16 }}>{item.favorite ? '★' : '☆'}</span>
                                                    </Button>
                                                </Tooltip>
                                                <Popconfirm
                                                    key="delete"
                                                    title="Delete entry and file?"
                                                    okText="Delete"
                                                    cancelText="Cancel"
                                                    onConfirm={async () => {
                                                        try {
                                                            await axios.delete(`/api/history/${item.uuid}`);
                                                            msgApi.success('Entry deleted');
                                                            if (detailsEntry?.uuid === item.uuid) setDetailsEntry(null);
                                                            void load();
                                                        } catch (e: any) {
                                                            msgApi.error(e?.response?.data?.error || 'Failed to delete');
                                                        }
                                                    }}
                                                >
                                                    <Button danger size="small">Delete</Button>
                                                </Popconfirm>
                                                <Typography.Text type="secondary">{formatDate(item.create_date)}</Typography.Text>
                                            </Space>
                                        </>
                                    }
                                />
                            </div>
                        </List.Item>
                    );
                }}
            />
            <Space style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}>
                <Pagination
                    current={page}
                    pageSize={pageSize}
                    total={total}
                    showSizeChanger
                    onChange={onPaginate}
                />
            </Space>
            <EntryDetailsModal
                entry={detailsEntry}
                modelNameById={modelNameById}
                formatDate={formatDate}
                onClose={() => setDetailsEntry(null)}
            />

            <MoveEntriesModal
                open={isMoveModalOpen}
                selectedCount={selectedCount}
                loading={movingEntries}
                loadingProjects={loadingProjects}
                projectOptions={projectOptions}
                targetProjectUuid={targetProjectUuid}
                onChangeTarget={(value) => setTargetProjectUuid(value)}
                onSubmit={() => void onMoveEntries()}
                onCancel={closeMoveModal}
            />
        </Card>
    );
};
