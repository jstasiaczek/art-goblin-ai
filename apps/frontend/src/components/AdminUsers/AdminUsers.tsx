import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Breadcrumb, Button, Space, Table, Tag, Form, Popconfirm, message, Card, Typography } from 'antd';
import axios from 'axios';
import { AuthContext } from '../../state/AuthContext';
import { AddUserModal, type AddUserFormValues } from './AddUserModal';
import { EditUserModal, type EditUserFormValues } from './EditUserModal';

type User = { id: number; uuid: string; email: string; role: 'admin' | 'user' };

export const AdminUsers: React.FC = () => {
    const { user } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [users, setUsers] = useState<User[]>([]);

    const [isCreateOpen, setCreateOpen] = useState(false);
    const [isEditOpen, setEditOpen] = useState<null | number>(null);
    const [createForm] = Form.useForm<AddUserFormValues>();
    const [editForm] = Form.useForm<EditUserFormValues>();

    const isAdmin = useMemo(() => (user?.role === 'admin'), [user]);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get<User[]>('/api/users');
            setUsers(res.data);
        } catch (e: any) {
            setError(e?.response?.data?.error || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) load();
    }, [isAdmin]);

    const onCreate = async () => {
        try {
            const vals = await createForm.validateFields();
            await axios.post('/api/users', vals);
            message.success('User created');
            setCreateOpen(false);
            createForm.resetFields();
            load();
        } catch (e: any) {
            if (e?.errorFields) return; // validation error
            message.error(e?.response?.data?.error || 'Failed to create user');
        }
    };

    const onEdit = async () => {
        const id = isEditOpen!;
        try {
            const vals = await editForm.validateFields();
            if (!vals.email && !vals.password && !vals.role) {
                message.warning('No changes');
                return;
            }
            await axios.put(`/api/users/${id}`, vals);
            message.success('User updated');
            setEditOpen(null);
            editForm.resetFields();
            load();
        } catch (e: any) {
            if (e?.errorFields) return; // validation error
            message.error(e?.response?.data?.error || 'Failed to update user');
        }
    };

    const onDelete = async (id: number) => {
        try {
            await axios.delete(`/api/users/${id}`);
            message.success('User deleted');
            load();
        } catch (e: any) {
            message.error(e?.response?.data?.error || 'Failed to delete user');
        }
    };

    if (!isAdmin) {
        return <Alert type="error" message="Insufficient permissions (admin role required)" />;
    }

    return (<Space direction="vertical" style={{ width: '100%' }} size="large">
        <Breadcrumb
            items={[
                { title: <a href="/">Projects</a> },
                { title: 'User management' },
            ]}
        />

        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Typography.Title level={4} style={{ margin: 0 }}>
                User management
            </Typography.Title>
        </Space>
        
        <Card
            extra={(
                <Space size={16}>
                    <Button type="primary" onClick={() => setCreateOpen(true)}>Add</Button>
                </Space>
            )}
        >
            {error && <Alert type="error" message={error} style={{ marginBottom: 12 }} />}

            <Table<User>
                rowKey="id"
                loading={loading}
                dataSource={users}
                pagination={{ pageSize: 10 }}
                columns={[
                    { title: 'ID', dataIndex: 'id', width: 80 },
                    { title: 'UUID', dataIndex: 'uuid' },
                    { title: 'Email', dataIndex: 'email' },
                    { title: 'Role', dataIndex: 'role', render: (r) => <Tag color={r === 'admin' ? 'red' : 'blue'}>{r}</Tag> },
                    {
                        title: 'Actions',
                        width: 220,
                        render: (_, record) => (
                            <Space>
                                <Button size="small" onClick={() => { setEditOpen(record.id); editForm.setFieldsValue({ email: record.email, role: record.role }); }}>Edit</Button>
                                <Popconfirm title="Delete user?" onConfirm={() => onDelete(record.id)}>
                                    <Button size="small" danger>Delete</Button>
                                </Popconfirm>
                            </Space>
                        ),
                    },
                ]}
            />

            <AddUserModal
                open={isCreateOpen}
                form={createForm}
                onSubmit={onCreate}
                onCancel={() => { setCreateOpen(false); createForm.resetFields(); }}
            />

            <EditUserModal
                open={isEditOpen !== null}
                form={editForm}
                onSubmit={onEdit}
                onCancel={() => { setEditOpen(null); editForm.resetFields(); }}
            />
        </Card>
    </Space>);
};
