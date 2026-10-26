import { ServicesPage } from '../../../components/services/ServicesPage';

export const metadata = { title: 'Services & rates' };

export default function Page() {
  return (
    <>
      <h1 className="disp">Services &amp; rates</h1>
      <ServicesPage />
    </>
  );
}
