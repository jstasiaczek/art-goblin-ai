import { Modal, Form, Input, Select } from 'antd';
import type { FormInstance } from 'antd/es/form';

export type EditUserFormValues = { email?: string; password?: string; role?: 'admin' | 'user' };

type EditUserModalProps = {
    open: boolean;
    form: FormInstance<EditUserFormValues>;
    loading?: boolean;
    onSubmit: () => void;
    onCancel: () => void;
};

export const EditUserModal: React.FC<EditUserModalProps> = ({ open, form, loading, onSubmit, onCancel }) => (
    <Modal
        title="Edit user"
        open={open}
        onOk={onSubmit}
        onCancel={onCancel}
        okText="Save"
        confirmLoading={loading}
        destroyOnHidden
    >
        <Form form={form} layout="vertical">
            <Form.Item name="email" label="Email">
                <Input placeholder="e.g. user@test.com" />
            </Form.Item>
            <Form.Item name="password" label="New password" rules={[{ min: 8, message: 'Min. 8 characters' }]}>
                <Input.Password placeholder="Change password (optional)" />
            </Form.Item>
            <Form.Item name="role" label="Role">
                <Select allowClear options={[{ label: 'user', value: 'user' }, { label: 'admin', value: 'admin' }]} />
            </Form.Item>
        </Form>
    </Modal>
);

