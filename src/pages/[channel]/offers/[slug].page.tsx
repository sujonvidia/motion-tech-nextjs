import React from 'react';
import { InferGetStaticPropsType } from 'next';

import { getStaticProps } from '@/src/components/pages/products/props';
import { OfferPage } from '@/src/components/pages/offers';
import { getStaticPaths } from '@/src/components/pages/products/paths';

const Page: React.FC<InferGetStaticPropsType<typeof getStaticProps>> = props => <OfferPage {...props} />;

export { getStaticPaths, getStaticProps };
export default Page;
