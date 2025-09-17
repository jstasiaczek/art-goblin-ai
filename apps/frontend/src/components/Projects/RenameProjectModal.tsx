import { Modal, Input } from 'antd';

type RenameProjectModalProps = {
    open: boolean;
    name: string;
    loading?: boolean;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onCancel: () => void;
};

export const RenameProjectModal: React.FC<RenameProjectModalProps> = ({
    open,
    name,
    loading,
    onChange,
    onSubmit,
    onCancel,
}) => (
    <Modal
        title="Rename project"
        open={open}
        onOk={onSubmit}
        onCancel={onCancel}
        confirmLoading={loading}
        okText="Save"
        cancelText="Cancel"
        destroyOnHidden
    >
        <Input
            value={name}
            onChange={(event) => onChange(event.target.value)}
            onPressEnter={onSubmit}
            placeholder="New project name"
            autoFocus
        />
    </Modal>
);

