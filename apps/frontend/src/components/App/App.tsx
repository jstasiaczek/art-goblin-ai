import { Layout, Switch, Button, Space, Spin, Menu, Tooltip } from 'antd';
import { useContext } from 'react';
import { ThemeContext } from '../../state/ThemeContext';
import { Projects } from '../Projects/Projects';
import { ProjectSelector } from '../ProjectSelector/ProjectSelector';
import { ProjectSpace } from '../ProjectSpace/ProjectSpace';
import { ProjectMediaExplorer } from '../ProjectMediaExplorer/ProjectMediaExplorer';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../../state/AuthContext';
import { Login } from '../Login/Login';
import { AdminUsers } from '../AdminUsers/AdminUsers';
import { AdminModelImport } from '../AdminModels/AdminModelImport';
import { ChangePassword } from '../Account/ChangePassword';
import { LogoutOutlined } from '@ant-design/icons';

const { Header, Content } = Layout;

export const App: React.FC = () => {
    const { darkMode, toggleTheme } = useContext(ThemeContext);
    const { isAuthenticated, logout, ready, user } = useContext(AuthContext);

    const path = typeof window !== 'undefined' ? window.location.pathname : '/';
    const selectedKey = path.startsWith('/projects')
        ? 'projects'
        : path.startsWith('/admin/models')
            ? 'models'
            : path.startsWith('/admin/users')
                ? 'users'
                : path.startsWith('/me/password')
                    ? 'password'
                    : 'home';

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexGrow: 1 }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                        <img style={{height: '32px'}} src="/art-goblin.svg" />
                        <div>ArtGoblinAI</div>
                    </div>
                    <Menu
                        theme="dark"
                        mode="horizontal"
                        style={{ flexGrow: 1 }}
                        selectedKeys={[selectedKey]}
                        items={[
                            { key: 'home', label: <a href="/">Home</a> },
                            ...(isAuthenticated ? [{ key: 'projects', label: <a href="/projects/manage">Manage projects</a> }] : []),
                            ...(isAuthenticated ? [{ key: 'password', label: <a href="/me/password">Change password</a> }] : []),
                            ...(isAuthenticated && user?.role === 'admin'
                                ? [
                                    { key: 'models', label: <a href="/admin/models">Import models</a> },
                                    { key: 'users', label: <a href="/admin/users">Users</a> },
                                ]
                                : []),
                        ]}
                    />
                </div>
                <Space>
                    <Switch
                        checked={darkMode}
                        onChange={toggleTheme}
                        checkedChildren="Dark"
                        unCheckedChildren="Light"
                    />
                    {isAuthenticated && (
                        <Tooltip title="Log out">
                            <Button size="small" shape="circle" aria-label="Log out" onClick={logout} icon={<LogoutOutlined />} />
                        </Tooltip>
                    )}
                </Space>
            </Header>
            <Layout>
                <Content style={{ padding: '24px' }}>
                    {!ready ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                            <Spin />
                        </div>
                    ) : !isAuthenticated ? (
                        <Login />
                    ) : (
                        <Router>
                            <Routes>
                                <Route path="/" element={<ProjectSelectorRoute />} />
                                <Route path="/project/:groupUuid" element={<ProjectSelectorRoute />} />
                                <Route path="/projects/manage" element={<Projects />} />
                                <Route path="/scene/:uuid" element={<ProjectSpaceRoute />} />
                                <Route path="/scene/:uuid/media" element={<ProjectMediaExplorerRoute />} />
                                <Route path="/admin/models" element={<AdminModelImport />} />
                                <Route path="/admin/users" element={<AdminUsers />} />
                                <Route path="/me/password" element={<ChangePassword />} />
                            </Routes>
                        </Router>
                    )}
                </Content>
            </Layout>
        </Layout>
    );
};

const ProjectSelectorRoute: React.FC = () => {
    const navigate = useNavigate();
    const params = useParams();
    const groupUuid = params.groupUuid;
    return (
        <ProjectSelector
            activeGroupUuid={groupUuid}
            onNavigateToGroups={groupUuid ? () => navigate('/') : undefined}
            onOpenProject={(uuid, group) => navigate(`/scene/${uuid}`, { state: group ? { fromGroupUuid: group } : undefined })}
            onOpenGroup={(uuid) => navigate(`/project/${uuid}`)}
        />
    );
};

const ProjectSpaceRoute: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const uuid = String(params.uuid);
    const state = location.state as { fromGroupUuid?: string } | undefined;
    const handleBack = (groupUuid?: string) => {
        if (groupUuid) {
            navigate(`/project/${groupUuid}`);
            return;
        }
        navigate('/');
    };
    return (
        <ProjectSpace projectUuid={uuid} onBack={handleBack} defaultGroupUuid={state?.fromGroupUuid} />
    );
};

const ProjectMediaExplorerRoute: React.FC = () => {
    const navigate = useNavigate();
    const params = useParams();
    const uuid = String(params.uuid);
    return (
        <ProjectMediaExplorer projectUuid={uuid} onBack={() => navigate(`/scene/${uuid}`)} />
    );
};
