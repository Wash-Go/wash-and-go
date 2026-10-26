import { StaffPage } from '../../../components/staff/StaffPage';

export const metadata = { title: 'Staff' };

export default function Page() {
  return (
    <>
      <h1 className="disp">Staff</h1>
      <StaffPage />
    </>
  );
}
