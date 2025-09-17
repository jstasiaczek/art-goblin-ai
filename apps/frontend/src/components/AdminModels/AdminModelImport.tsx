import React, { useContext, useMemo, useState } from 'react';
import { Alert, Breadcrumb, Button, Card, Col, Row, Space, Typography, Upload, message } from 'antd';
import type { RcFile, UploadFile } from 'antd/es/upload/interface';
import axios from 'axios';
import { AuthContext } from '../../state/AuthContext';
import { useModels } from '../../state/ModelsContext';
import { UploadOutlined } from '@ant-design/icons';

export const AdminModelImport: React.FC = () => {
    const { user } = useContext(AuthContext);
    const { refresh } = useModels();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [msgApi, contextHolder] = message.useMessage();
    const [fileList, setFileList] = useState<UploadFile[]>([]);

    const isAdmin = useMemo(() => user?.role === 'admin', [user]);

    const resetSelection = () => {
        setSelectedFile(null);
        setFileList([]);
    };

    const handleBeforeUpload = (file: RcFile) => {
        setSelectedFile(file);
        setFileList([
            {
                uid: file.uid,
                name: file.name,
                status: 'done',
                originFileObj: file,
            },
        ]);
        return false;
    };

    const handleRemove = () => {
        resetSelection();
        return true;
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            msgApi.warning('Select a JSON file before importing');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            setLoading(true);
            await axios.post('/api/models/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            msgApi.success('Models imported successfully');
            resetSelection();
            await refresh();
        } catch (err: any) {
            const apiError = err?.response?.data?.error;
            msgApi.error(apiError || 'Failed to import models');
        } finally {
            setLoading(false);
        }
    };

    if (!isAdmin) {
        return <Alert type="error" message="Insufficient permissions (admin role required)" />;
    }

    return (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
            {contextHolder}
            <Breadcrumb
                items={[
                    { title: <a href="/">Projects</a> },
                    { title: 'Model import' },
                ]}
            />

            <Typography.Title level={4} style={{ margin: 0 }}>
                Model import
            </Typography.Title>

            <Card>
                <Row gutter={[32, 32]}>
                    <Col xs={24} md={12}>
                        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                            <Typography.Paragraph style={{ marginBottom: 0 }}>
                                Upload a JSON file that follows the same format as example.
                            </Typography.Paragraph>
                            <Alert
                                type="warning"
                                message="All existing models in the database will be replaced by the uploaded file."
                                showIcon
                            />
                            <Upload
                                accept="application/json"
                                beforeUpload={handleBeforeUpload}
                                onRemove={handleRemove}
                                fileList={fileList}
                                maxCount={1}
                                showUploadList={{ showRemoveIcon: true }}
                            >
                                <Button icon={<UploadOutlined />}>Select JSON file</Button>
                            </Upload>

                            <Space>
                                <Button type="primary" onClick={handleUpload} loading={loading} disabled={!selectedFile}>
                                    Import
                                </Button>
                                <Button onClick={resetSelection} disabled={!selectedFile || loading}>
                                    Clear
                                </Button>
                            </Space>
                        </Space>
                    </Col>
                    <Col xs={24} md={12}>
                        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                            <Typography.Title level={5} style={{ margin: 0 }}>
                                Example JSON structure
                            </Typography.Title>
                            <Typography.Paragraph style={{ marginBottom: 0 }}>
                                Use this as a reference when preparing the import file, or run the script from <code>utils/model_scrapper.js</code> in your browser console on the pricing page at <code>nano-gpt.com</code>.
                                Inital file is located at <code>apps/backend/src/models.json</code>.
                            </Typography.Paragraph>
                            <Typography.Paragraph style={{ marginBottom: 0 }}>
                                <pre style={{ background: '#111a2c', color: '#fff', padding: 16, borderRadius: 8, overflowX: 'auto' }}>
                                    {`[
  {
    "id": "example-model",
    "name": "Example Model",
    "sizes": [
      {
        "width": 1024,
        "height": 1024,
        "price": "$0.005",
        "maxImages": "20"
      },
      (...)
    ]
  },
  (...)
]`}
                                </pre>
                            </Typography.Paragraph>
                        </Space>
                    </Col>
                </Row>
            </Card>
        </Space>
    );
};
