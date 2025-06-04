import { createFileRoute } from '@tanstack/react-router';
import { UploadForm } from '../components/UploadForm'; // Adjust path if needed

export const Route = createFileRoute('/')({
  component: () => (
    <div className="p-2">
      <UploadForm />
    </div>
  ),
});