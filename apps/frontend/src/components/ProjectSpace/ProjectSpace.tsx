import { Alert, Breadcrumb, Button, Card, Col, Row, Skeleton, Space, Typography } from 'antd';
import { ImageForm } from '../ImageForm/ImageForm';
import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { ProjectHistory } from '../ProjectHistory/ProjectHistory';
import type { ImageFormHandle, FormValues } from '../ImageForm/ImageForm';
import type { HistoryEntry } from '../../types/history';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileImageOutlined } from '@ant-design/icons';
import type { ProjectWithGroupName } from '../../types/projects';

type Props = {
    projectUuid: string;
    onBack: (groupUuid?: string) => void;
    defaultGroupUuid?: string;
};

export const ProjectSpace: React.FC<Props> = ({ projectUuid, onBack, defaultGroupUuid }) => {
    const navigate = useNavigate();
    const [project, setProject] = useState<ProjectWithGroupName | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [historyRefreshKey, setHistoryRefreshKey] = useState<number>(0);
    const formRef = useRef<ImageFormHandle | null>(null);
    const location = useLocation();
    const locationState = (location.state as { restoreEntry?: HistoryEntry } | undefined) ?? undefined;
    const restoreEntry = locationState?.restoreEntry;
    const manualRestoreRef = useRef(false);

    useEffect(() => {
        manualRestoreRef.current = false;
    }, [projectUuid]);

    const mapHistoryToFormValues = useCallback((entry: HistoryEntry): Partial<FormValues> => ({
        prompt: entry.prompt,
        model: entry.model,
        width: entry.width,
        height: entry.height,
        negative_prompt: entry.negative_prompt,
        nImages: entry.n_images,
        num_steps: entry.num_steps,
        resolution: entry.resolution,
        sampler_name: entry.sampler_name,
        scale: entry.scale,
        imageDataUrl: entry.image_data_url,
        kontext_max_mode: entry.kontext_max_mode,
        provider: entry.provider as any,
        response_format: (entry.response_format as any) ?? 'b64_json',
        seed: entry.seed,
        project_uuid: projectUuid,
    }), [projectUuid]);

    useEffect(() => {
        if (!restoreEntry || !formRef.current) return;
        manualRestoreRef.current = true;
        formRef.current.setFromHistory(mapHistoryToFormValues(restoreEntry));

        const state = location.state && typeof location.state === 'object'
            ? Object.fromEntries(Object.entries(location.state).filter(([key]) => key !== 'restoreEntry'))
            : undefined;

        navigate(`${location.pathname}${location.search}`, {
            replace: true,
            state: state && Object.keys(state).length > 0 ? state : null,
        });
    }, [restoreEntry, mapHistoryToFormValues, navigate, location.pathname, location.search, location.state]);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError(null);
        axios.get<ProjectWithGroupName>(`/api/projects/${projectUuid}`)
            .then((res) => {
                if (!mounted) return;
                setProject(res.data);
            })
            .catch((e: any) => {
                if (!mounted) return;
                setError(e?.response?.data?.error || 'Failed to load project');
            })
            .finally(() => {
                if (!mounted) return;
                setLoading(false);
            });
        return () => { mounted = false; };
    }, [projectUuid]);

    // Load latest history entry into form on open
    useEffect(() => {
        if (manualRestoreRef.current) return;
        let mounted = true;
        axios.get<HistoryEntry[]>(`/api/history`, { params: { project_uuid: projectUuid, pageSize: 1 } })
            .then((res) => {
                if (!mounted) return;
                const entry = res.data?.[0];
                if (entry && formRef.current) {
                    formRef.current.setFromHistory(mapHistoryToFormValues(entry));
                }
            })
            .catch(() => { /* ignore */ });

        return () => { mounted = false; };
    }, [projectUuid, mapHistoryToFormValues]);

    const handleRestore = (entry: HistoryEntry) => {
        if (!formRef.current) return;
        manualRestoreRef.current = true;
        formRef.current.setFromHistory(mapHistoryToFormValues(entry));
    };

    const groupUuidToReturn = project?.group_uuid ?? defaultGroupUuid;

    return (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Breadcrumb
                items={[
                    {
                        title: <a onClick={() => onBack()}>Projects</a>,
                    },
                    {
                        title: <a onClick={() => onBack(groupUuidToReturn)}>{project?.group_name ?? groupUuidToReturn}</a>,
                    },
                    
                    { title: project?.name ?? projectUuid },
                ].filter(Boolean) as { title: React.ReactNode }[]}
            />

            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Typography.Title level={4} style={{ margin: 0 }}>Scene workspace</Typography.Title>
            </Space>
            {error && <Alert type="error" message={error} />}
            <Row gutter={24}>
                <Col xs={24} md={14}>
                    <Card
                        title={loading ? <Skeleton.Input active size="small" style={{ width: 200 }} /> : `Scene: ${project?.name ?? projectUuid}`}
                        extra={<Space>
                            {project?.group_name ? <Typography.Text type="secondary">Project: {project.group_name}</Typography.Text> : undefined}
                            <Button icon={<FileImageOutlined />} onClick={() => navigate(`/scene/${projectUuid}/media`)}>Media</Button>
                        </Space>}
                    >
                        <ImageForm ref={formRef} projectUuid={projectUuid} onGenerated={() => setHistoryRefreshKey((k) => k + 1)} />
                    </Card>
                </Col>
                <Col xs={24} md={10}>
                    <ProjectHistory projectUuid={projectUuid} refreshKey={historyRefreshKey} onRestore={handleRestore} />
                </Col>
            </Row>
        </Space>
    );
};
