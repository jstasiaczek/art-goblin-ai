import { Modal, Input } from 'antd';

type CreateSceneModalProps = {
    open: boolean;
    value: string;
    loading?: boolean;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onCancel: () => void;
};

export const CreateSceneModal: React.FC<CreateSceneModalProps> = ({
    open,
    value,
    loading,
    onChange,
    onSubmit,
    onCancel,
}) => (
    <Modal
        title="Create scene"
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
            placeholder="Scene name"
            autoFocus
        />
    </Modal>
);

