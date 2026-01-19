import { useEffect, useState } from 'react';
import { Alert, Breadcrumb, Button, Card, Col, Empty, Image, Pagination, Row, Space, Typography, Tooltip, Switch, message, Grid } from 'antd';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { EditOutlined } from '@ant-design/icons';
import type { HistoryEntry } from '../../types/history';

type Props = {
    projectUuid: string;
    onBack?: () => void;
};

export const ProjectMediaExplorer: React.FC<Props> = ({ projectUuid, onBack }) => {
    const [items, setItems] = useState<HistoryEntry[]>([]);
    const [allItems, setAllItems] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(12);
    const [total, setTotal] = useState<number>(0);
    const [favoritesOnly, setFavoritesOnly] = useState<boolean>(false);
    const navigate = useNavigate();
    const [msgApi, msgCtx] = message.useMessage();
    const [projectName, setProjectName] = useState<string>('');
    const [projectGroupName, setProjectGroupName] = useState<string>('');
    const [projectGroupUuid, setProjectGroupUuid] = useState<string>('');
    const [previewVisible, setPreviewVisible] = useState<boolean>(false);
    const [previewIndex, setPreviewIndex] = useState<number>(0);
    const screens = Grid.useBreakpoint();

    const height = screens.xs ? 250 : screens.sm ? 300 : screens.md ? 400 : 500;

    const load = async (p = page, ps = pageSize) => {
        try {
            setLoading(true);
            setError(null);
            const params: Record<string, string | number> = { project_uuid: projectUuid, page: p, pageSize: ps };
            if (favoritesOnly) params.favorite = 'true';
            const [metaRes, listRes] = await Promise.all([
                axios.get<{ total: number }>('/api/history/meta', { params }),
                axios.get<HistoryEntry[]>('/api/history', { params }),
            ]);
            const totalCount = metaRes.data.total || 0;
            setTotal(totalCount);
            const pageItems = (listRes.data || []).filter((entry) => Boolean(entry.image_name));
            setItems(pageItems);

            if (totalCount > 0) {
                try {
                    const fullRes = await axios.get<HistoryEntry[]>('/api/history', {
                        params: {
                            project_uuid: projectUuid,
                            page: 1,
                            pageSize: totalCount,
                            favorite: favoritesOnly ? 'true' : undefined,
                        },
                    });
                    const fullItems = (fullRes.data || []).filter((entry) => Boolean(entry.image_name));
                    setAllItems(fullItems);
                } catch {
                    setAllItems(pageItems);
                }
            } else {
                setAllItems([]);
            }
        } catch (e: any) {
            setError(e?.response?.data?.error || 'Failed to load media');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setPage(1);
        void load(1, pageSize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectUuid, favoritesOnly]);

    useEffect(() => {
        let active = true;
        axios.get<{ name: string; group_name: string; group_uuid: string }>(`/api/projects/${projectUuid}`)
            .then((res) => {
                if (!active) return;
                setProjectName(res.data?.name ?? '');
                setProjectGroupName(res.data?.group_name ?? '');
                setProjectGroupUuid(res.data?.group_uuid ?? '');
            })
            .catch(() => {
                if (!active) return;
                setProjectName('');
                setProjectGroupName('');
                setProjectGroupUuid('');
            });
        return () => { active = false; };
    }, [projectUuid]);

    const onPaginate = (p: number, ps: number) => {
        setPage(p);
        setPageSize(ps);
        void load(p, ps);
    };

    useEffect(() => {
        if (!previewVisible) return;
        if (!allItems.length) {
            setPreviewVisible(false);
            return;
        }
        if (previewIndex >= allItems.length) {
            setPreviewIndex(Math.max(0, allItems.length - 1));
        }
    }, [allItems, previewIndex, previewVisible]);

    const openPreview = (uuid: string) => {
        const index = allItems.findIndex((entry) => entry.uuid === uuid);
        setPreviewIndex(index >= 0 ? index : 0);
        setPreviewVisible(true);
    };

    const formatDate = (d: HistoryEntry['create_date']) => {
        try {
            const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
            if (!date || Number.isNaN(date.getTime())) return String(d);
            return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
        } catch {
            return String(d);
        }
    };

    const favoriteHandler = (item: HistoryEntry) => async () => {
        try {
            const desired = !item.favorite;
            const res = await axios.patch(`/api/history/${item.uuid}/favorite`, { favorite: desired });
            const updated = typeof res?.data?.favorite === 'boolean' ? res.data.favorite : desired;
            setItems((prev) => {
                const arr = prev.map((it) => (it.uuid === item.uuid ? { ...it, favorite: updated } : it));
                return favoritesOnly && !updated ? arr.filter((it) => it.uuid !== item.uuid) : arr;
            });
            setAllItems((prev) => prev.map((it) => (it.uuid === item.uuid ? { ...it, favorite: updated } : it)));
            if (favoritesOnly && !updated) setTotal((t) => Math.max(0, t - 1));
            msgApi.success(updated ? 'Added to favorites' : 'Removed from favorites');
        } catch (e: any) {
            msgApi.error(e?.response?.data?.error || 'Failed to update');
        }
    };

    return (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
            {msgCtx}
            <Breadcrumb
                items={[
                    { title: <a onClick={() => navigate('/')}>Projects</a> },
                    {
                        title: projectGroupUuid !== ''
                            ? <a onClick={() => navigate(`/project/${projectGroupUuid}`)}>{projectGroupName}</a>
                            : projectGroupName,
                    },
                    {
                        title: projectUuid !== ''
                            ? <a onClick={() => navigate(`/scene/${projectUuid}`)}>{projectName}</a>
                            : projectName,
                    },
                    { title: 'Media' },
                ]}
            />
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Typography.Title level={4} style={{ margin: 0 }}>Media {total ? `(${total})` : ''}</Typography.Title>
                <Space>
                    <span>Favorites only</span>
                    <Switch checked={favoritesOnly} onChange={setFavoritesOnly} size="small" />
                    <Button onClick={onBack}>Back to scene</Button>
                </Space>
            </Space>
            <Card loading={loading}>
                {error && <Alert type="error" message={error} style={{ marginBottom: 12 }} />}
                {items.length === 0 && !loading ? (
                    <Empty description="No images" />
                ) : (
                    <>
                        <Row gutter={[16, 16]}>
                            {items.map((item) => (
                                <Col key={item.uuid} xs={24} sm={12} md={12} lg={6}>
                                    <Card
                                        hoverable
                                        cover={
                                            <div
                                                style={{ width: '100%', height, overflow: 'hidden', cursor: 'pointer' }}
                                                onClick={() => openPreview(item.uuid)}
                                            >
                                                <Image
                                                    src={`/api/generated/${item.image_name}`}
                                                    alt={item.image_name}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    preview={false}
                                                />
                                            </div>
                                        }
                                        actions={[
                                            <Tooltip key="fav" title={item.favorite ? 'Remove from favorites' : 'Add to favorites'}>
                                                <Button
                                                    size="small"
                                                    type="text"
                                                    onClick={favoriteHandler(item)}
                                                >
                                                    <span style={{ fontSize: 16 }}>{item.favorite ? '★' : '☆'}</span>
                                                </Button>
                                            </Tooltip>,
                                            <Tooltip key="load" title="Load in editor">
                                                <Button
                                                    size="small"
                                                    type="text"
                                                    icon={<EditOutlined />}
                                                    onClick={() => navigate(`/scene/${projectUuid}`, { state: { restoreEntry: item } })}
                                                />
                                            </Tooltip>,
                                            <a key="download" href={`/api/generated/${item.image_name}`} download>
                                                Download
                                            </a>,
                                        ]}
                                    >
                                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                            <Typography.Text>{item.width}x{item.height}</Typography.Text>
                                            <Typography.Text type="secondary">{formatDate(item.create_date)}</Typography.Text>
                                        </Space>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                        <Image.PreviewGroup
                            preview={{
                                visible: previewVisible,
                                current: previewIndex,
                                onChange: (current) => {
                                    setPreviewIndex(current);
                                },
                                onVisibleChange: (visible) => setPreviewVisible(visible),
                            }}
                        >
                            {allItems.length > 0 && (
                                <div style={{ display: 'none' }}>
                                    {allItems.map((item) => (
                                        <Image
                                            key={`${item.uuid}-hidden`}
                                            src={`/api/generated/${item.image_name}`}
                                            alt={item.image_name}
                                        />
                                    ))}
                                </div>
                            )}
                        </Image.PreviewGroup>
                    </>
                )}
                <Space style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}>
                    <Pagination current={page} pageSize={pageSize} total={total} onChange={onPaginate} showSizeChanger />
                </Space>
            </Card>
        </Space>
    );
};
