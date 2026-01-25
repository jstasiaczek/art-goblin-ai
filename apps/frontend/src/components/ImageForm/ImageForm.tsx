import { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, InputNumber, Select, Switch, Typography, Alert, Image, message, Row, Col, Empty, Card, Space, Spin, theme, Radio, Tooltip, Grid } from 'antd';
import { ReloadOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import axios from 'axios';
import { forwardRef, useImperativeHandle } from 'react';
import { useModels } from '../../state/ModelsContext';
import { SnippetsModal } from './SnippetsModal';

export type FormValues = {
    prompt: string;
    model?: string;
    width?: number;
    height?: number;
    project_uuid?: string;
    negative_prompt?: string;
    nImages?: number;
    num_steps?: number;
    resolution?: string;
    sampler_name?: string;
    scale?: number;
    imageDataUrl?: string;
    kontext_max_mode?: boolean;
    // New minimal fields for API-2 support
    provider?: 'api1' | 'api2';
    response_format?: 'b64_json' | 'url';
    seed?: number;
};

export type ImageFormHandle = {
    setFromHistory: (entry: Partial<FormValues>) => void;
};

type Props = { projectUuid: string; onGenerated?: () => void };

export const ImageForm = forwardRef<ImageFormHandle, Props>(({ projectUuid, onGenerated }, ref) => {
    const { token } = theme.useToken();
    const screens = Grid.useBreakpoint();
    const [form] = Form.useForm<FormValues>();
    const provider = Form.useWatch('provider', form) as 'api1' | 'api2' | undefined;
    const { models, loading: modelsLoading, error: modelsError, favoriteModelIds, toggleFavorite } = useModels();
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [msgApi, contextHolder] = message.useMessage();
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [resultCost, setResultCost] = useState<number | null>(null);
    const [resultBalance, setResultBalance] = useState<number | null>(null);
    const [snippetsModalVisible, setSnippetsModalVisible] = useState<boolean>(false);
    const usdFmt = useMemo(
        () => new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 3,
        }),
        []
    );
    const [selectedModelId, setSelectedModelId] = useState<string | undefined>(undefined);
    const [selectedSizeKey, setSelectedSizeKey] = useState<string | undefined>(undefined);

    // Models are provided by context; no local fetch here

    const selectedModel = useMemo(() => models.find(m => m.id === selectedModelId), [models, selectedModelId]);

    const sizeOptions = useMemo(() => {
        if (!selectedModel) return [] as { label: string; value: string }[];
        return selectedModel.sizes.map((s) => {
            const label = `${s.width}x${s.height} (${s.price})`;
            const value = `${s.width}x${s.height}`;
            return { label, value };
        });
    }, [selectedModel]);

    const onChangeModel = (modelId: string) => {
        setSelectedModelId(modelId);
        const [width, height] = [form.getFieldValue('width'), form.getFieldValue('height')];
        const model = models.find(m => m.id === modelId);
        const foundSize = model?.sizes.find((s) => s.width === width && s.height === height);
        if (!foundSize) {
            form.setFieldsValue({ model: modelId, width: undefined, height: undefined });
            setSelectedSizeKey(undefined);
        } else {
            form.setFieldsValue({ model: modelId, width, height });
            setSelectedSizeKey(`${width}x${height}`);
        }
    };

    const onChangeSize = (val: string) => {
        setSelectedSizeKey(val);
        const [w, h] = val.split('x');
        const width = Number(w);
        const height = Number(h);
        if (!Number.isNaN(width) && !Number.isNaN(height)) {
            form.setFieldsValue({ width, height });
        }
    };

    useEffect(() => {
        form.setFieldsValue({ project_uuid: projectUuid });
    }, [projectUuid, form]);

    useImperativeHandle(ref, () => ({
        setFromHistory: (entry: Partial<FormValues>) => {
            if (entry.model) setSelectedModelId(entry.model);
            if (entry.width && entry.height) setSelectedSizeKey(`${entry.width}x${entry.height}`);
            form.setFieldsValue({ ...entry });
        },
    }), [form]);

    const openSnippetsModal = () => {
        setSnippetsModalVisible(true);
    };

    const closeSnippetsModal = () => {
        setSnippetsModalVisible(false);
    };

    const appendSnippetToPrompt = (snippet: string) => {
        const current = form.getFieldValue('prompt') as string | undefined;
        const next = current && current.trim().length > 0 ? `${current}\n${snippet}` : snippet;
        form.setFieldsValue({ prompt: next });
    };

    type GenerateImageResponseLegacy = { image: string; cost: number; inputTokens?: number; outputTokens?: number };
    type GenerateImageResponseV2 = {
        created: number;
        data: Array<{ b64_json: string } | { url: string }>;
        cost: number;
        paymentSource?: string;
        remainingBalance?: number;
    };

    const onFinish = async (values: FormValues) => {
        setSubmitting(true);
        setError(null);
        setResultImage(null);
        setResultCost(null);
        setResultBalance(null);
        try {
            const res = await axios.post<GenerateImageResponseLegacy | GenerateImageResponseV2>(
                '/api/generate-image',
                values,
                { headers: { 'Content-Type': 'application/json' } },
            );
            const payload = res.data as GenerateImageResponseLegacy | GenerateImageResponseV2;
            let img: string | null = null;
            let cost: number | null = null;
            let remainingBalance: number | null = null;

            if ('data' in payload && Array.isArray(payload.data)) {
                const first = payload.data[0];
                if (first && 'b64_json' in first) {
                    img = `data:image/png;base64,${first.b64_json}`;
                } else if (first && 'url' in first) {
                    img = first.url;
                }
                cost = (payload as GenerateImageResponseV2).cost ?? null;
                remainingBalance = (payload as GenerateImageResponseV2).remainingBalance ?? null;
            } else if ('image' in payload) {
                img = payload.image;
                cost = payload.cost ?? null;
            }

            if (!img) throw new Error('No image in response');

            setResultImage(img);
            setResultCost(cost);
            setResultBalance(remainingBalance);
            msgApi.success('Image generated');
            onGenerated?.();
        } catch (e: any) {
            setError(e?.response?.data?.error || 'Failed to generate image');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            {contextHolder}
            
            <Row gutter={24}>
                <Col xs={24} md={12}>
                    <Typography.Title level={4}>Generate Image</Typography.Title>
                    {modelsError && <Alert type="error" message={modelsError} style={{ marginBottom: 16 }} />}
                    {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={onFinish}
                        initialValues={{ provider: 'api2', nImages: 1, num_steps: 20, scale: 7.5, kontext_max_mode: false }}
                    >
                        {/* Provider selection */}
                        <Form.Item name="provider" label="Provider">
                            <Radio.Group optionType="button" buttonStyle="solid">
                                <Radio.Button value="api2">OpenAI compatible</Radio.Button>
                                <Radio.Button value="api1" style={{ color: '#999', opacity: 0.6 }}>Legacy</Radio.Button>
                            </Radio.Group>
                        </Form.Item>
                        <Form.Item label="Model" required>
                            <Select
                                loading={modelsLoading}
                                placeholder="Select a model"
                                options={[...models]
                                    .sort((a, b) => {
                                        const aFav = favoriteModelIds.has(a.id) ? 1 : 0;
                                        const bFav = favoriteModelIds.has(b.id) ? 1 : 0;
                                        return bFav - aFav;
                                    })
                                    .map(m => ({
                                        label: (
                                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                                <span>{m.name} ({m.id})</span>
                                                <span
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        toggleFavorite(m.id);
                                                    }}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    style={{ cursor: 'pointer', marginLeft: 8, color: favoriteModelIds.has(m.id) ? '#faad14' : '#d9d9d9' }}
                                                >
                                                    {favoriteModelIds.has(m.id) ? <StarFilled /> : <StarOutlined />}
                                                </span>
                                            </span>
                                        ),
                                        value: m.id,
                                        searchLabel: `${m.name} (${m.id})`,
                                    }))}
                                value={selectedModelId}
                                onChange={onChangeModel}
                                showSearch
                                optionFilterProp="searchLabel"
                            />
                        </Form.Item>

                        <Form.Item label="Size" required>
                            <Select
                                placeholder="Select a size"
                                disabled={!selectedModel}
                                options={sizeOptions}
                                value={selectedSizeKey}
                                onChange={onChangeSize}
                                showSearch
                                optionFilterProp="label"
                            />
                        </Form.Item>

                        <Form.Item name="model" hidden>
                            <Input />
                        </Form.Item>
                        <Form.Item name="width" hidden>
                            <InputNumber />
                        </Form.Item>
                        <Form.Item name="height" hidden>
                            <InputNumber />
                        </Form.Item>
                        <Form.Item name="project_uuid" hidden>
                            <Input />
                        </Form.Item>
                        <Form.Item name="nImages" hidden>
                            <InputNumber />
                        </Form.Item>
                        <Form.Item name="response_format" initialValue="b64_json" hidden>
                            <Input />
                        </Form.Item>

                        <Form.Item
                            name="prompt"
                            label={(
                                <Space align="center">
                                    <span>Prompt</span>
                                    <Button size="small" type="link" onClick={openSnippetsModal} style={{ padding: 0 }}>
                                        Snippets
                                    </Button>
                                </Space>
                            )}
                            rules={[{ required: true, message: 'Enter a prompt' }]}
                        >
                            <Input.TextArea rows={8} placeholder="Describe what you want to generate" />
                        </Form.Item>

                        {provider !== 'api2' && (
                            <Form.Item name="negative_prompt" label="Negative Prompt">
                                <Input.TextArea rows={2} placeholder="What to avoid in the image" />
                            </Form.Item>
                        )}

                        <Row gutter={[12, 12]}>
                            <Col xs={24} md={8}>
                                <Form.Item name="num_steps" label="Steps">
                                    <InputNumber min={1} max={200} style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item name="scale" label="Scale">
                                    <InputNumber min={0} max={50} step={0.1} style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                            {provider === 'api2' && (
                                <Col xs={24} md={8}>
                                    <Form.Item label="Seed">
                                        <Space.Compact style={{ width: '100%' }}>
                                            <Form.Item name="seed" noStyle>
                                                <InputNumber min={0} style={{ width: '100%' }} />
                                            </Form.Item>
                                            <Tooltip title="Random seed">
                                                <Button
                                                    aria-label="Random seed"
                                                    onClick={() => form.setFieldsValue({ seed: Math.floor(Math.random() * 2147483647) })}
                                                    icon={<ReloadOutlined />}
                                                />
                                            </Tooltip>
                                        </Space.Compact>
                                    </Form.Item>
                                </Col>
                            )}
                        </Row>

                        {null}

                        <Form.Item name="kontext_max_mode" label="Max context mode" valuePropName="checked">
                            <Switch />
                        </Form.Item>

                        <div
                            style={{
                                ...(screens.md
                                    ? {
                                        position: 'sticky',
                                        bottom: 0,
                                        background: token.colorBgContainer,
                                        padding: 12,
                                        borderTop: `1px solid ${token.colorBorderSecondary}`,
                                        zIndex: 1,
                                    }
                                    : { marginTop: 24 }),
                                display: 'flex',
                                justifyContent: screens.md ? 'flex-end' : 'stretch',
                            }}
                        >
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={submitting}
                                block={!screens.md}
                            >
                                Generate
                            </Button>
                        </div>
                    </Form>
                </Col>
                <Col xs={24} md={12}>
                    <Card style={{ minHeight: 300 }}>
                        <div style={{ position: 'relative', minHeight: 260 }}>
                            {(resultCost !== null || resultBalance !== null) && (
                                <Space size={8} wrap style={{ marginBottom: 12 }}>
                                    {resultCost !== null && (
                                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                            Cost: {usdFmt.format(resultCost)}
                                        </Typography.Text>
                                    )}
                                    {resultBalance !== null && (
                                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                            Remaining balance: {usdFmt.format(resultBalance)}
                                        </Typography.Text>
                                    )}
                                </Space>
                            )}
                            {resultImage ? (
                                <Image src={resultImage} alt="Generated image" style={{ maxWidth: '100%' }} />
                            ) : (
                                <Empty description="No image" />
                            )}
                            {submitting && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Spin size="large" />
                                </div>
                            )}
                        </div>
                    </Card>
                </Col>
            </Row>
            <SnippetsModal
                open={snippetsModalVisible}
                onClose={closeSnippetsModal}
                onAppend={appendSnippetToPrompt}
                messageApi={msgApi}
            />
        </>
    );
});
