import React from 'react';
import { useSession } from './hooks/useSession';
import { useFiles } from './hooks/useFiles';
import { HandshakeUI } from './components/HandshakeUI';
import { DashboardUI } from './components/DashboardUI';

function App() {
    const { session, isMobile, init, verify, reset } = useSession();
    const { files, uploading, progress, status, upload } = useFiles(session.status === 'AUTHENTICATED');

    if (session.status !== 'AUTHENTICATED') {
        return (
            <HandshakeUI
                session={session}
                isMobile={isMobile}
                onInit={init}
                onVerify={verify}
            />
        );
    }

    return (
        <DashboardUI
            files={files}
            uploading={uploading}
            progress={progress}
            status={status}
            onUpload={upload}
            onReset={reset}
        />
    );
}

export default App;
