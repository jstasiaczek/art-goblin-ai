import { useEffect, useState } from 'react';
import { Breadcrumb, Button, Card, Empty, Image, List, Space, Typography, message, Grid } from 'antd';
import axios from 'axios';
import { FileImageOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Link from 'antd/es/typography/Link';
import { CreateSceneModal } from './CreateSceneModal';
import { CreateProjectModal } from './CreateProjectModal';
import type { ProjectSummaryGroup } from '../../types/projects';

type Props = {
    onOpenProject: (projectUuid: string, groupUuid?: string) => void;
    onOpenGroup: (groupUuid: string) => void;
    activeGroupUuid?: string;
    onNavigateToGroups?: () => void;
};

export const ProjectSelector: React.FC<Props> = ({ onOpenProject, onOpenGroup, activeGroupUuid, onNavigateToGroups }) => {
    const [groups, setGroups] = useState<ProjectSummaryGroup[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [msgApi, contextHolder] = message.useMessage();
    const navigate = useNavigate();
    const [isCreateSceneModalOpen, setIsCreateSceneModalOpen] = useState<boolean>(false);
    const [newSceneName, setNewSceneName] = useState<string>('');
    const [creatingScene, setCreatingScene] = useState<boolean>(false);
    const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState<boolean>(false);
    const [newProjectName, setNewProjectName] = useState<string>('');
    const [creatingProject, setCreatingProject] = useState<boolean>(false);
    const screens = Grid.useBreakpoint();

    const load = async () => {
        try {
            setLoading(true);
            const res = await axios.get<ProjectSummaryGroup[]>('/api/projects/summary');
            setGroups(res.data || []);
        } catch {
            msgApi.error('Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectedGroup = activeGroupUuid ? groups.find((group) => group.uuid === activeGroupUuid) ?? null : null;

    const openCreateSceneModal = () => {
        setNewSceneName('');
        setIsCreateSceneModalOpen(true);
    };

    const closeCreateSceneModal = () => {
        if (creatingScene) return;
        setIsCreateSceneModalOpen(false);
    };

    const onCreateScene = async () => {
        if (!selectedGroup) {
            return;
        }
        const trimmedName = newSceneName.trim();
        if (!trimmedName) {
            msgApi.warning('Enter scene name');
            return;
        }
        try {
            setCreatingScene(true);
            await axios.post('/api/projects', { name: trimmedName, groupUuid: selectedGroup.uuid });
            msgApi.success('Scene created');
            setIsCreateSceneModalOpen(false);
            setNewSceneName('');
            void load();
        } catch {
            msgApi.error('Failed to create scene');
        } finally {
            setCreatingScene(false);
        }
    };

    const openCreateProjectModal = () => {
        setNewProjectName('');
        setIsCreateProjectModalOpen(true);
    };

    const closeCreateProjectModal = () => {
        if (creatingProject) return;
        setIsCreateProjectModalOpen(false);
    };

    const onCreateProject = async () => {
        const trimmedName = newProjectName.trim();
        if (!trimmedName) {
            msgApi.warning('Enter project name');
            return;
        }
        try {
            setCreatingProject(true);
            await axios.post('/api/project-groups', { name: trimmedName });
            msgApi.success('Project created');
            setIsCreateProjectModalOpen(false);
            setNewProjectName('');
            void load();
        } catch {
            msgApi.error('Failed to create project');
        } finally {
            setCreatingProject(false);
        }
    };

    const renderGroupCardCover = (group: ProjectSummaryGroup) => {
        const firstProject = group.projects[0];
        if (firstProject?.lastImageName) {
            return (
                <Image
                    src={`/api/generated/${firstProject.lastImageName}`}
                    alt={firstProject.name}
                    style={{ objectFit: 'cover' }}
                    height={160}
                    preview={false}
                />
            );
        }
        return (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                <Typography.Text type="secondary">No projects</Typography.Text>
            </div>
        );
    };

    return (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Breadcrumb
                items={[
                    {
                        title: activeGroupUuid && onNavigateToGroups
                            ? <a onClick={onNavigateToGroups}>Projects</a>
                            : 'Projects',
                    },
                    ...(selectedGroup ? [{ title: selectedGroup.name }] : []),
                ]}
            />

            {contextHolder}
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Typography.Title level={4} style={{ margin: 0 }}>
                    {activeGroupUuid ? 'Select a scene' : 'Select a project' }
                </Typography.Title>
                <Space>
                    {!activeGroupUuid && (
                        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateProjectModal}>
                            Add project
                        </Button>
                    )}
                    {selectedGroup && (
                        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateSceneModal}>
                            Add scene
                        </Button>
                    )}
                </Space>
            </Space>

            {!activeGroupUuid && (
                <List
                    rowKey={(group) => group.uuid}
                    loading={loading}
                    grid={{ gutter: 16, column: screens.md ? 4 : 1 }}
                    dataSource={groups}
                    locale={{ emptyText: <Empty description="No groups" /> }}
                    renderItem={(group) => (
                        <List.Item>
                            <Card
                                hoverable
                                onClick={() => onOpenGroup(group.uuid)}
                                cover={renderGroupCardCover(group)}
                            >
                                <Card.Meta
                                    title={`${group.name} (${group.projects.length})`}
                                />
                            </Card>
                        </List.Item>
                    )}
                />
            )}

            {activeGroupUuid && !selectedGroup && !loading && (
                <Empty description="Group not found" />
            )}

            {selectedGroup && (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <List
                        rowKey={(item) => item.uuid}
                        loading={loading}
                        grid={{ gutter: 16, column: screens.lg ? 6 : screens.md ? 3 : 1 }}
                        dataSource={selectedGroup.projects}
                        locale={{ emptyText: <Empty description="No projects in the group" /> }}
                        renderItem={(item) => (
                            <List.Item>
                                <Card
                                    
                                    cover={item.lastImageName ? (
                                        <Image
                                            onClick={() => onOpenProject(item.uuid, selectedGroup.uuid)}
                                            src={`/api/generated/${item.lastImageName}`}
                                            alt={item.name}
                                            style={{ objectFit: 'cover', cursor: 'pointer' }}
                                            height={160}
                                            preview={false}
                                        />
                                    ) : undefined}
                                >
                                    <Card.Meta
                                        title={<Space
                                            direction='horizontal'
                                            size={8}
                                            style={{ justifyContent: 'space-between', width: '100%' }}
                                        >
                                            <Link 
                                                onClick={() => onOpenProject(item.uuid, selectedGroup.uuid)}>{item.name}</Link>
                                            <Button icon={<FileImageOutlined />} onClick={() => navigate(`/scene/${item.uuid}/media`)}>Media</Button>
                                        </Space>}
                                    />
                                </Card>
                            </List.Item>
                        )}
                    />
                </Space>
            )}

            <CreateSceneModal
                open={isCreateSceneModalOpen}
                value={newSceneName}
                loading={creatingScene}
                onChange={setNewSceneName}
                onSubmit={() => void onCreateScene()}
                onCancel={closeCreateSceneModal}
            />

            <CreateProjectModal
                open={isCreateProjectModalOpen}
                value={newProjectName}
                loading={creatingProject}
                onChange={setNewProjectName}
                onSubmit={() => void onCreateProject()}
                onCancel={closeCreateProjectModal}
            />
        </Space>
    );
};
