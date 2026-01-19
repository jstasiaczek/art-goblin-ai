import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../state/AuthContext';
import { useModels } from '../../state/ModelsContext';

export const Login: React.FC = () => {
    const { login, needsSetup, completeSetup } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [setupLoading, setSetupLoading] = useState(false);
    const [setupError, setSetupError] = useState<string | null>(null);
    const [showSetup, setShowSetup] = useState(needsSetup);
    const { refresh } = useModels();

    useEffect(() => {
        setShowSetup(needsSetup);
    }, [needsSetup]);

    const onFinish = async (values: { email: string; password: string }) => {
        setLoading(true);
        setError(null);
        try {
            await login(values.email, values.password);
        } catch (e: any) {
            setError(e?.response?.data?.error || 'Failed to log in');
        } finally {
            setLoading(false);
        }
    };

    const onSetup = async (values: { email: string; password: string; confirm: string }) => {
        setSetupLoading(true);
        setSetupError(null);
        try {
            await completeSetup(values.email, values.password);
        } catch (err: any) {
            if (err?.response?.status === 409) {
                setError('Administrator already exists. Please log in.');
                setShowSetup(false);
            } else if (err?.response?.data?.error) {
                setSetupError(err.response.data.error);
            } else {
                setSetupError('Failed to create admin');
            }
        } finally {
            refresh();
            setSetupLoading(false);
        }
    };

    if (showSetup) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <Card style={{ width: 420 }}>
                    <Typography.Title level={4} style={{ textAlign: 'center' }}>Initial setup</Typography.Title>
                    <Typography.Paragraph type="secondary" style={{ textAlign: 'center' }}>
                        Create the first administrator account to start using the app.
                    </Typography.Paragraph>
                    {setupError && <Alert type="error" message={setupError} style={{ marginBottom: 12 }} />}
                    <Form layout="vertical" onFinish={onSetup} requiredMark={false}>
                        <Form.Item name="email" label="Admin email" rules={[{ required: true, message: 'Enter email' }, { type: 'email', message: 'Enter valid email' }]}>
                            <Input autoFocus placeholder="e.g. admin@example.com" />
                        </Form.Item>
                        <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Enter password' }, { min: 8, message: 'Password must be at least 8 characters' }]}>
                            <Input.Password placeholder="Password" />
                        </Form.Item>
                        <Form.Item
                            name="confirm"
                            label="Confirm password"
                            dependencies={["password"]}
                            rules={[
                                { required: true, message: 'Confirm password' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('password') === value) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error('Passwords do not match'));
                                    },
                                }),
                            ]}
                        >
                            <Input.Password placeholder="Repeat password" />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" block loading={setupLoading}>Create administrator</Button>
                        </Form.Item>
                    </Form>
                </Card>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <Card style={{ width: 360 }}>
                <Typography.Title level={4} style={{ textAlign: 'center' }}>Log in</Typography.Title>
                {error && <Alert type="error" message={error} style={{ marginBottom: 12 }} />}
                <Form layout="vertical" onFinish={onFinish}>
                    <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Enter email' }]}>
                        <Input autoFocus placeholder="e.g. admin@test.com" />
                    </Form.Item>
                    <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Enter password' }]}>
                        <Input.Password placeholder="Password" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading}>Log in</Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};
