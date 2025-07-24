import React from 'react';
import DatabaseBackupForm from '../components/DatabaseBackupForm';
import UpdateEmailForm from '../components/UpdateUsernameForm';
import ShopSettingsForm from '../components/ShopSettingsForm';

function Settings() {
  return (
    <div className="p-4">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-8">Settings</h1>
      
      <div className="space-y-6">
        <ShopSettingsForm />
        <DatabaseBackupForm />
        <UpdateEmailForm />
      </div>
    </div>
  );
}

export default Settings;