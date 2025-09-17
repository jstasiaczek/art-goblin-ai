import { useEffect, useMemo, useState } from 'react';
import { Breadcrumb, Button, Card, Divider, Empty, Input, List, Popconfirm, Select, Space, Typography, message } from 'antd';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { EditSceneModal } from './EditSceneModal';
import { RenameProjectModal } from './RenameProjectModal';
import type { Project, ProjectGroup } from '../../types/projects';

export const Projects: React.FC = () => {
    const navigate = useNavigate();
    const [groups, setGroups] = useState<ProjectGroup[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [selectedGroupUuid, setSelectedGroupUuid] = useState<string | null>(null);
    const [newName, setNewName] = useState<string>('');
    const [creating, setCreating] = useState<boolean>(false);
    const [editingUuid, setEditingUuid] = useState<string | null>(null);
    const [editName, setEditName] = useState<string>('');
    const [editGroupUuid, setEditGroupUuid] = useState<string>('');
    const [savingEdit, setSavingEdit] = useState<boolean>(false);
    const [newGroupName, setNewGroupName] = useState<string>('');
    const [creatingGroup, setCreatingGroup] = useState<boolean>(false);
    const [editingGroupUuid, setEditingGroupUuid] = useState<string | null>(null);
    const [groupEditName, setGroupEditName] = useState<string>('');
    const [savingGroupEdit, setSavingGroupEdit] = useState<boolean>(false);
    const groupOptions = useMemo(() => groups.map((group) => ({ value: group.uuid, label: group.name })), [groups]);
    const [msgApi, contextHolder] = message.useMessage();

    const selectedGroup = groups.find((g) => g.uuid === selectedGroupUuid) ?? groups[0] ?? null;

    useEffect(() => {
        if (!groups.length) {
            setSelectedGroupUuid(null);
            return;
        }
        if (selectedGroupUuid && !groups.some((group) => group.uuid === selectedGroupUuid)) {
            setSelectedGroupUuid(groups[0].uuid);
            return;
        }
        if (!selectedGroupUuid) {
            setSelectedGroupUuid(groups[0].uuid);
        }
    }, [groups, selectedGroupUuid]);

    const load = async () => {
        try {
            setLoading(true);
            const res = await axios.get<ProjectGroup[]>('/api/project-groups', { params: { withProjects: 1 } });
            const data = res.data || [];
            setGroups(data);
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

    const onCreate = async () => {
        if (!selectedGroup) {
            msgApi.warning('Add a group first');
            return;
        }
        const name = newName.trim();
        if (!name) {
            msgApi.warning('Enter project name');
            return;
        }
        try {
            setCreating(true);
            const res = await axios.post<Project>('/api/projects', { name, groupUuid: selectedGroup.uuid });
            setGroups((prev) => prev.map((group) => group.uuid === selectedGroup.uuid ? { ...group, projects: [res.data, ...group.projects] } : group));
            setNewName('');
            msgApi.success('Project created');
        } catch {
            msgApi.error('Failed to create project');
        } finally {
            setCreating(false);
        }
    };

    const onDelete = async (uuid: string) => {
        try {
            await axios.delete<{ ok: boolean }>(`/api/projects/${uuid}`);
            setGroups((prev) => prev.map((group) => ({
                ...group,
                projects: group.projects.filter((project) => project.uuid !== uuid),
            })));
            msgApi.success('Project deleted');
        } catch {
            msgApi.error('Failed to delete project');
        }
    };

    const startEdit = (p: Project) => {
        setEditingUuid(p.uuid);
        setEditName(p.name);
        setEditGroupUuid(p.group_uuid);
    };

    const saveEdit = async () => {
        if (!editingUuid) return;
        const name = editName.trim();
        if (!name) {
            msgApi.warning('Enter project name');
            return;
        }
        if (!editGroupUuid) {
            msgApi.warning('Select a group');
            return;
        }
        try {
            setSavingEdit(true);
            const res = await axios.put<Project>(`/api/projects/${editingUuid}`, { name, groupUuid: editGroupUuid });
            setGroups((prev) => prev.map((group) => {
                const projectsWithoutEdited = group.projects.filter((project) => project.uuid !== editingUuid);
                if (group.uuid === res.data.group_uuid) {
                    return { ...group, projects: [res.data, ...projectsWithoutEdited] };
                }
                return { ...group, projects: projectsWithoutEdited };
            }));
            setEditingUuid(null);
            setEditName('');
            setEditGroupUuid('');
            msgApi.success('Changes saved');
        } catch {
            msgApi.error('Failed to save changes');
        } finally {
            setSavingEdit(false);
        }
    };

    const cancelEdit = () => {
        setEditingUuid(null);
        setEditName('');
        setEditGroupUuid('');
    };

    const onCreateGroup = async () => {
        const name = newGroupName.trim();
        if (!name) {
            msgApi.warning('Enter group name');
            return;
        }
        try {
            setCreatingGroup(true);
            const res = await axios.post<ProjectGroup>('/api/project-groups', { name });
            const newGroup = { ...res.data, projects: [] };
            setGroups((prev) => [...prev, newGroup]);
            setSelectedGroupUuid(newGroup.uuid);
            setNewGroupName('');
            msgApi.success('Group created');
        } catch {
            msgApi.error('Failed to create group');
        } finally {
            setCreatingGroup(false);
        }
    };

    const startEditGroup = (group: ProjectGroup) => {
        setEditingGroupUuid(group.uuid);
        setGroupEditName(group.name);
    };

    const saveGroupEdit = async () => {
        if (!editingGroupUuid) return;
        const name = groupEditName.trim();
        if (!name) {
            msgApi.warning('Enter group name');
            return;
        }
        try {
            setSavingGroupEdit(true);
            const res = await axios.put<ProjectGroup>(`/api/project-groups/${editingGroupUuid}`, { name });
            setGroups((prev) => prev.map((group) => (group.uuid === editingGroupUuid ? { ...group, name: res.data.name } : group)));
            setEditingGroupUuid(null);
            setGroupEditName('');
            msgApi.success('Group renamed');
        } catch {
            msgApi.error('Failed to rename group');
        } finally {
            setSavingGroupEdit(false);
        }
    };

    const cancelGroupEdit = () => {
        setEditingGroupUuid(null);
        setGroupEditName('');
    };

    const onDeleteGroup = async (group: ProjectGroup) => {
        try {
            await axios.delete<{ ok: boolean }>(`/api/project-groups/${group.uuid}`);
            setGroups((prev) => {
                const updated = prev.filter((item) => item.uuid !== group.uuid);
                if (selectedGroupUuid === group.uuid) {
                    setSelectedGroupUuid(updated[0]?.uuid ?? null);
                }
                return updated;
            });
            msgApi.success('Group deleted');
        } catch (err: any) {
            if (err?.response?.data?.error) {
                msgApi.error(err.response.data.error);
            } else {
                msgApi.error('Failed to delete group');
            }
        }
    };

    return (<Space direction="vertical" style={{ width: '100%' }} size="large">
        <Breadcrumb
            items={[
                { title: <a onClick={() => navigate('/')}>Projects</a> },
                { title: 'Project management' },
            ]}
        />

        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Typography.Title level={4} style={{ margin: 0 }}>
                Project management
            </Typography.Title>
        </Space>
    
        <Card
            variant='outlined'
        >
            {contextHolder}
            <Space direction="vertical" style={{ width: '100%' }} size="large">
                <Typography.Title level={5} style={{ margin: 0 }}>Projects</Typography.Title>
                <Space.Compact style={{ width: '100%' }}>
                    <Input
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="New project name"
                        onPressEnter={() => void onCreateGroup()}
                    />
                    <Button type="primary" loading={creatingGroup} onClick={() => void onCreateGroup()}>
                        Add project
                    </Button>
                </Space.Compact>

                <Space style={{ width: '100%' }}>
                    <Select
                        style={{ minWidth: 200 }}
                        value={selectedGroup?.uuid}
                        onChange={(value) => setSelectedGroupUuid(value)}
                        placeholder="Select a project"
                        options={groups.map((group) => ({ value: group.uuid, label: group.name }))}
                    />
                    {selectedGroup && (
                        <Space>
                            <Button type="link" onClick={() => startEditGroup(selectedGroup)}>
                                Rename project
                            </Button>
                            <Popconfirm
                                title="Delete project?"
                                okText="Yes"
                                cancelText="No"
                                onConfirm={() => void onDeleteGroup(selectedGroup)}
                                disabled={(selectedGroup?.projects.length ?? 0) > 0}
                            >
                                <Button type="link" danger disabled={(selectedGroup?.projects.length ?? 0) > 0}>
                                    Delete project
                                </Button>
                            </Popconfirm>
                        </Space>
                    )}
                </Space>

                <Divider style={{ margin: '8px 0' }} />

                <Typography.Title level={5} style={{ margin: 0 }}>Scenes{selectedGroup ? ` in project: ${selectedGroup.name}` : ''}</Typography.Title>
                <Space.Compact style={{ width: '100%' }}>
                    <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="New scene name"
                        onPressEnter={() => void onCreate()}
                    />
                    <Button type="primary" loading={creating} onClick={() => void onCreate()}>
                        Add
                    </Button>
                </Space.Compact>

                <List
                    rowKey={(item) => item.uuid}
                    loading={loading}
                    dataSource={selectedGroup?.projects ?? []}
                    locale={{ emptyText: <Empty description={selectedGroup ? 'No scenes in project' : 'No projects'} /> }}
                    renderItem={(item) => (
                        <List.Item
                            actions={[
                                <Button key="edit" type="link" onClick={() => startEdit(item)}>
                                    Edit
                                </Button>,
                                <Popconfirm
                                    key="delete"
                                    title="Delete secene? All related data will be lost."
                                    okText="Yes"
                                    cancelText="No"
                                    onConfirm={() => void onDelete(item.uuid)}
                                >
                                    <Button danger type="link">Delete</Button>
                                </Popconfirm>,
                            ]}
                        >
                            <List.Item.Meta
                                title={<Typography.Text>{item.name}</Typography.Text>}
                                description={<Typography.Text type="secondary">{item.uuid}</Typography.Text>}
                            />
                        </List.Item>
                    )}
                />
            </Space>

            <EditSceneModal
                open={Boolean(editingUuid)}
                name={editName}
                groupUuid={editGroupUuid}
                options={groupOptions}
                loading={savingEdit}
                onChangeName={setEditName}
                onChangeGroup={setEditGroupUuid}
                onSubmit={() => void saveEdit()}
                onCancel={cancelEdit}
            />

            <RenameProjectModal
                open={Boolean(editingGroupUuid)}
                name={groupEditName}
                loading={savingGroupEdit}
                onChange={setGroupEditName}
                onSubmit={() => void saveGroupEdit()}
                onCancel={cancelGroupEdit}
            />
        </Card>
    </Space>);
};
