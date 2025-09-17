import { Alert, Modal, Select, Space, Typography } from 'antd';

type Option = { value: string; label: string };

type MoveEntriesModalProps = {
    open: boolean;
    selectedCount: number;
    loading: boolean;
    loadingProjects: boolean;
    projectOptions: Option[];
    targetProjectUuid: string;
    onChangeTarget: (value: string) => void;
    onSubmit: () => void;
    onCancel: () => void;
};

export const MoveEntriesModal: React.FC<MoveEntriesModalProps> = ({
    open,
    selectedCount,
    loading,
    loadingProjects,
    projectOptions,
    targetProjectUuid,
    onChangeTarget,
    onSubmit,
    onCancel,
}) => (
    <Modal
        title="Move entries"
        open={open}
        onOk={onSubmit}
        onCancel={onCancel}
        confirmLoading={loading}
        okText="Move"
        cancelText="Cancel"
        okButtonProps={{ disabled: projectOptions.length === 0 }}
        destroyOnHidden
    >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Typography.Text type="secondary">
                Selected entries: {selectedCount}
            </Typography.Text>
            <Select<string>
                showSearch
                placeholder="Select destination project"
                options={projectOptions}
                loading={loadingProjects}
                value={targetProjectUuid || undefined}
                onChange={onChangeTarget}
                optionFilterProp="label"
                style={{ width: '100%' }}
            />
            {!projectOptions.length && !loadingProjects && (
                <Alert type="info" message="No other projects available" showIcon />
            )}
        </Space>
    </Modal>
);

