import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Col, Empty, Form, Input, List, Modal, Popconfirm, Row, Space, Typography } from 'antd';
import axios from 'axios';
import type { MessageInstance } from 'antd/es/message/interface';

type Snippet = {
    id: number;
    uuid: string;
    title: string | null;
    snippet: string;
};

type SnippetFormValues = {
    title?: string;
    snippet: string;
};

type SnippetsModalProps = {
    open: boolean;
    onClose: () => void;
    onAppend: (snippet: string) => void;
    messageApi: MessageInstance;
};

export const SnippetsModal: React.FC<SnippetsModalProps> = ({ open, onClose, onAppend, messageApi }) => {
    const [form] = Form.useForm<SnippetFormValues>();
    const [snippets, setSnippets] = useState<Snippet[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [search, setSearch] = useState<string>('');
    const [submitting, setSubmitting] = useState<boolean>(false);

    const loadSnippets = useCallback(async (query?: string) => {
        try {
            setLoading(true);
            const params = query ? { q: query } : {};
            const res = await axios.get<Snippet[]>('/api/snippets', { params });
            setSnippets(res.data || []);
        } catch {
            messageApi.error('Failed to load snippets');
        } finally {
            setLoading(false);
        }
    }, [messageApi]);

    useEffect(() => {
        if (!open) return;
        form.resetFields();
        setSearch('');
        void loadSnippets();
    }, [open, form, loadSnippets]);

    const handleSubmit = useCallback(async (values: SnippetFormValues) => {
        try {
            setSubmitting(true);
            const res = await axios.post<Snippet>('/api/snippets', {
                title: values.title,
                snippet: values.snippet,
            });
            setSnippets((prev) => [res.data, ...prev]);
            form.resetFields();
            messageApi.success('Snippet added');
        } catch (err: any) {
            messageApi.error(err?.response?.data?.error || 'Failed to add snippet');
        } finally {
            setSubmitting(false);
        }
    }, [form, messageApi]);

    const handleSearch = useCallback((value: string) => {
        const trimmed = value.trim();
        setSearch(value);
        void loadSnippets(trimmed);
    }, [loadSnippets]);

    const handleDelete = useCallback(async (uuid: string) => {
        try {
            await axios.delete(`/api/snippets/${uuid}`);
            setSnippets((prev) => prev.filter((item) => item.uuid !== uuid));
            messageApi.success('Snippet removed');
        } catch (err: any) {
            messageApi.error(err?.response?.data?.error || 'Failed to delete snippet');
        }
    }, [messageApi]);

    const listLocale = useMemo(() => ({ emptyText: <Empty description="No snippets" /> }), []);

    return (
        <Modal
            open={open}
            onCancel={onClose}
            title="Snippets"
            footer={null}
            width={720}
            destroyOnHidden
        >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
                <Form form={form} size='small' layout="horizontal" onFinish={handleSubmit}>
                    <Row gutter={16} wrap>
                        <Col xs={24} md={18}>
                            <Form.Item name="title">
                                <Input placeholder="Title (optional)" />
                            </Form.Item>
                            <Form.Item
                                name="snippet"
                                rules={[{ required: true, message: 'Enter snippet content' }]}
                            >
                                <Input placeholder="Snippet content" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={6}>
                            <Form.Item label=" " colon={false}>
                                <Space direction="vertical" style={{ width: '100%' }} size={24}>
                                    <Button onClick={() => form.resetFields()} disabled={submitting}>Clear</Button>
                                    <Button type="primary" htmlType="submit" loading={submitting}>Save</Button>
                                </Space>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>

                <Input.Search
                    size='small'
                    placeholder="Search snippets"
                    value={search}
                    onChange={(event) => handleSearch(event.target.value)}
                    onSearch={(value) => handleSearch(value)}
                    allowClear
                />

                <List
                    loading={loading}
                    size='small'
                    dataSource={snippets}
                    locale={listLocale}
                    rowKey={(item) => item.uuid}
                    style={{ maxHeight: 360, overflowY: 'auto', paddingRight: 8 }}
                    renderItem={(item) => (
                        <List.Item
                            actions={[
                                <Button key="use" type="link" onClick={() => { onAppend(item.snippet); messageApi.success('Snippet appended to prompt'); }}>Use</Button>,
                                <Popconfirm
                                    key="delete"
                                    title="Delete snippet?"
                                    okText="Yes"
                                    cancelText="No"
                                    onConfirm={() => void handleDelete(item.uuid)}
                                >
                                    <Button danger type="link">Delete</Button>
                                </Popconfirm>,
                            ]}
                        >
                            <List.Item.Meta
                                title={item.title}
                                description={<Typography.Paragraph style={{ marginBottom: 0 }}>{item.snippet}</Typography.Paragraph>}
                            />
                        </List.Item>
                    )}
                />
            </Space>
        </Modal>
    );
};
