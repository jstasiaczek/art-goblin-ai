import { Modal, Input } from 'antd';

type CreateProjectModalProps = {
    open: boolean;
    value: string;
    loading?: boolean;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onCancel: () => void;
};

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
    open,
    value,
    loading,
    onChange,
    onSubmit,
    onCancel,
}) => (
    <Modal
        title="Create project"
        open={open}
        onOk={onSubmit}
        onCancel={onCancel}
        confirmLoading={loading}
        okText="Create"
        cancelText="Cancel"
        destroyOnHidden
    >
        <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onPressEnter={onSubmit}
            placeholder="Project name"
            autoFocus
        />
    </Modal>
);

