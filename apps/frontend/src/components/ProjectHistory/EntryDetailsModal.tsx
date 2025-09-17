import { Modal, Space, Image, Descriptions, Typography } from 'antd';
import type { HistoryEntry } from '../../types/history';

type EntryDetailsModalProps = {
    entry: HistoryEntry | null;
    modelNameById: Record<string, string>;
    formatDate: (date: HistoryEntry['create_date']) => string;
    onClose: () => void;
};

export const EntryDetailsModal: React.FC<EntryDetailsModalProps> = ({ entry, modelNameById, formatDate, onClose }) => (
    <Modal
        title="Entry details"
        open={Boolean(entry)}
        onOk={onClose}
        onCancel={onClose}
        okText="Close"
        cancelButtonProps={{ style: { display: 'none' } }}
        width={720}
        destroyOnHidden
    >
        {entry && (
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
                {entry.image_name && (
                    <Image
                        src={`/api/generated/${entry.image_name}`}
                        alt={entry.image_name}
                        style={{ maxHeight: 240, objectFit: 'contain' }}
                    />
                )}
                <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label="Model">
                        <Space size={8}>
                            <Typography.Text>{modelNameById[entry.model] ?? entry.model}</Typography.Text>
                            <Typography.Text type="secondary">({entry.model})</Typography.Text>
                        </Space>
                    </Descriptions.Item>
                    {entry.provider && (
                        <Descriptions.Item label="Provider">{entry.provider}</Descriptions.Item>
                    )}
                    {entry.response_format && (
                        <Descriptions.Item label="Response Format">{entry.response_format}</Descriptions.Item>
                    )}
                    {typeof entry.seed === 'number' && (
                        <Descriptions.Item label="Seed">{entry.seed}</Descriptions.Item>
                    )}
                    <Descriptions.Item label="Size">{entry.width}x{entry.height}</Descriptions.Item>
                    <Descriptions.Item label="Prompt">{entry.prompt}</Descriptions.Item>
                    {entry.negative_prompt && (
                        <Descriptions.Item label="Negative Prompt">{entry.negative_prompt}</Descriptions.Item>
                    )}
                    {entry.n_images !== undefined && (
                        <Descriptions.Item label="Images">{entry.n_images}</Descriptions.Item>
                    )}
                    {entry.num_steps !== undefined && (
                        <Descriptions.Item label="Steps">{entry.num_steps}</Descriptions.Item>
                    )}
                    {entry.scale !== undefined && (
                        <Descriptions.Item label="Scale">{entry.scale}</Descriptions.Item>
                    )}
                    {entry.resolution && (
                        <Descriptions.Item label="Resolution">{entry.resolution}</Descriptions.Item>
                    )}
                    {entry.sampler_name && (
                        <Descriptions.Item label="Sampler">{entry.sampler_name}</Descriptions.Item>
                    )}
                    {entry.image_data_url && (
                        <Descriptions.Item label="Image Data URL">
                            <Typography.Paragraph copyable ellipsis={{ rows: 2 }}>
                                {entry.image_data_url}
                            </Typography.Paragraph>
                        </Descriptions.Item>
                    )}
                    {entry.kontext_max_mode !== undefined && (
                        <Descriptions.Item label="Max context mode">{String(entry.kontext_max_mode)}</Descriptions.Item>
                    )}
                    <Descriptions.Item label="Created">{formatDate(entry.create_date)}</Descriptions.Item>
                    <Descriptions.Item label="UUID">{entry.uuid}</Descriptions.Item>
                    <Descriptions.Item label="File">{entry.image_name}</Descriptions.Item>
                </Descriptions>
            </Space>
        )}
    </Modal>
);
