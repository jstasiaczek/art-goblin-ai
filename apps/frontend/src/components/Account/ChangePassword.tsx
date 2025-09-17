import React, { useState } from 'react';
import { Card, Form, Input, Button, Alert, message, Breadcrumb, Space, Typography } from 'antd';
import axios from 'axios';

type FormValues = { currentPassword: string; newPassword: string; confirmNewPassword: string };

export const ChangePassword: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form] = Form.useForm<FormValues>();

    const onFinish = async (values: FormValues) => {
        setLoading(true);
        setError(null);
        try {
            if (values.newPassword !== values.confirmNewPassword) {
                setError('New password and confirmation must match');
                return;
            }
            await axios.put('/api/me/password', {
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
            });
            message.success('Password changed');
            form.resetFields();
        } catch (e: any) {
            setError(e?.response?.data?.error || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    return (<Space direction="vertical" style={{ width: '100%' }} size="large">
        <Breadcrumb
            items={[
                { title: <a href="/">Projects</a> },
                { title: 'Change password' },
            ]}
        />
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Typography.Title level={4} style={{ margin: 0 }}>
                Change password
            </Typography.Title>
        </Space>
        <Card
            style={{ width: 420, margin: '0 auto' }}
        >
            {error && <Alert type="error" message={error} style={{ marginBottom: 12 }} />}
            <Form layout="vertical" form={form} onFinish={onFinish}>
                <Form.Item name="currentPassword" label="Current password" rules={[{ required: true, message: 'Enter current password' }]}>
                    <Input.Password placeholder="Current password" autoFocus />
                </Form.Item>
                <Form.Item name="newPassword" label="New password" rules={[{ required: true, message: 'Enter new password' }, { min: 8, message: 'Min. 8 characters' }]}>
                    <Input.Password placeholder="New password" />
                </Form.Item>
                <Form.Item name="confirmNewPassword" label="Confirm new password" rules={[{ required: true, message: 'Confirm the new password' }]}>
                    <Input.Password placeholder="Confirm new password" />
                </Form.Item>
                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block>
              Save
                    </Button>
                </Form.Item>
            </Form>
        </Card>
    </Space>
    );
};
