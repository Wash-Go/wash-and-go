import { ShopProfile } from '../../../components/shop/ShopProfile';

export const metadata = { title: 'Shop' };

export default function Page() {
  return (
    <>
      <h1 className="disp">Shop</h1>
      <ShopProfile />
    </>
  );
}
