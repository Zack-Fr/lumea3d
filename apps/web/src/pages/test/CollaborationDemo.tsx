import React, { useState } from 'react';
import { Users, Monitor, MessageCircle, Bell } from 'lucide-react';
import CollaborationDashboard from '../../components/collaboration/CollaborationDashboard';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

const CollaborationDemo: React.FC = () => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentCamera, setCurrentCamera] = useState({
    position: [0, 1.7, 5] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    target: [0, 0, 0] as [number, number, number]
  });

  // Mock project data
  const projectId = 'demo-project-123';
  const projectName = 'Modern Living Room Design';
  const sceneId = 'demo-scene-456';

  const handleCameraUpdate = (position: [number, number, number], rotation: [number, number, number]) => {
    setCurrentCamera(prev => ({ ...prev, position, rotation }));
  };

  const handleFollowUser = (userId: string) => {
    console.log('Following user:', userId);
    // In a real app, this would update the 3D camera to follow the user's viewport
  };

  const simulateCameraMovement = () => {
    setCurrentCamera(prev => ({
      ...prev,
      position: [
        Math.random() * 10 - 5,
        Math.random() * 3 + 1,
        Math.random() * 10 - 5
      ] as [number, number, number],
      rotation: [
        Math.random() * 360,
        Math.random() * 360, 
        Math.random() * 360
      ] as [number, number, number]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Collaboration System Demo
              </h1>
              <p className="text-gray-600">
                Demonstrating real-time invitations, sessions, and viewport synchronization
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-700">Project:</div>
                <div className="text-lg font-semibold text-blue-600">{projectName}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Viewport Simulation */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                3D Viewport Simulation
              </h2>
              
              <Button
                onClick={simulateCameraMovement}
                variant="outline"
                size="sm"
              >
                Simulate Camera Movement
              </Button>
            </div>
            
            {/* Mock 3D Viewport */}
            <div className="bg-gray-900 rounded-lg aspect-video flex items-center justify-center relative overflow-hidden">
              <div className="text-white text-center">
                <Monitor size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">3D Scene Viewport</p>
                <p className="text-sm opacity-75">
                  Camera Position: [{currentCamera.position.map(p => p.toFixed(1)).join(', ')}]
                </p>
                <p className="text-sm opacity-75">
                  Rotation: [{currentCamera.rotation.map(r => r.toFixed(1)).join(', ')}]
                </p>
              </div>
              
              {/* Mock grid overlay */}
              <div className="absolute inset-0 opacity-20">
                <svg width="100%" height="100%">
                  <defs>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="white" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>
            </div>

            {/* Viewport Controls */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Viewport Controls</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>
                  <span className="font-medium">X:</span> {currentCamera.position[0].toFixed(2)}
                </div>
                <div>
                  <span className="font-medium">Y:</span> {currentCamera.position[1].toFixed(2)}
                </div>
                <div>
                  <span className="font-medium">Z:</span> {currentCamera.position[2].toFixed(2)}
                </div>
                <div>
                  <span className="font-medium">Status:</span> 
                  <span className="text-green-600 ml-1">Active</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Feature Overview */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Features Demo
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900">Invitations</h3>
                  <p className="text-sm text-blue-700">Send and manage project collaboration invites</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <Monitor className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-green-900">Sessions</h3>
                  <p className="text-sm text-green-700">Real-time collaborative sessions with participants</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                <Monitor className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-purple-900">Viewport Sync</h3>
                  <p className="text-sm text-purple-700">Synchronize camera positions and follow users</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                <MessageCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-orange-900">Real-time Chat</h3>
                  <p className="text-sm text-orange-700">Communicate with team members instantly</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <Bell className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-900">Notifications</h3>
                  <p className="text-sm text-red-700">Real-time alerts for invites and events</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Instructions */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">How to Test</h2>
            
            <div className="space-y-3 text-sm">
              <div>
                <strong>1. Open the Collaboration Panel</strong>
                <p className="text-gray-600 ml-4">Click the floating button in the top-right to access all collaboration features.</p>
              </div>
              
              <div>
                <strong>2. Send Invitations</strong>
                <p className="text-gray-600 ml-4">Use the "Invites" tab to send collaboration invitations to team members.</p>
              </div>
              
              <div>
                <strong>3. Manage Sessions</strong>
                <p className="text-gray-600 ml-4">View active sessions and manage participants in the "Sessions" tab.</p>
              </div>
              
              <div>
                <strong>4. Sync Viewports</strong>
                <p className="text-gray-600 ml-4">Use the "Viewport" tab to broadcast or follow other users' camera positions.</p>
              </div>
              
              <div>
                <strong>5. Real-time Chat</strong>
                <p className="text-gray-600 ml-4">Click the chat bubble in the bottom-right to communicate with your team.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Collaboration Dashboard */}
      <CollaborationDashboard
        projectId={projectId}
        projectName={projectName}
        sceneId={sceneId}
        currentCamera={currentCamera}
        onCameraUpdate={handleCameraUpdate}
        onFollowUser={handleFollowUser}
        position="right"
        isMinimized={isMinimized}
        onToggleMinimize={() => setIsMinimized(!isMinimized)}
      />

      {/* Real-time Chat - Disabled in demo (requires SceneProvider) */}
      <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 rounded-lg p-3 text-sm text-yellow-800 max-w-xs">
        💬 Real-time chat requires full SceneProvider integration
      </div>

      {/* Development Notes */}
      <div className="max-w-6xl mx-auto mt-8">
        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <h2 className="text-lg font-semibold mb-4 text-yellow-900">
            Development Notes
          </h2>
          
          <div className="text-sm text-yellow-800 space-y-2">
            <p>
              <strong>Backend Integration Required:</strong> This demo showcases the frontend components. 
              To fully function, the backend API endpoints for invitations and sessions need to be implemented.
            </p>
            
            <p>
              <strong>Real-time Events:</strong> The WebSocket events for INVITE_RECEIVED, SESSION_STARTED, 
              VIEWPORT_SYNC, and NOTIFICATION need to be added to the backend gateway.
            </p>
            
            <p>
              <strong>Authentication:</strong> The system integrates with your existing JWT authentication. 
              Make sure users are properly authenticated before accessing collaboration features.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CollaborationDemo;