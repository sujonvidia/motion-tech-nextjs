import React from 'react';
import { InferGetServerSidePropsType } from 'next';
import { getServerSideProps as checkoutGetServerSideProps } from '@/src/components/pages/checkout/props';
import { getStaticProps as productGetStaticProps } from '@/src/components/pages/products/props';
import { CheckoutPage } from '@/src/components/pages/checkout';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import styled from '@emotion/styled';
import { ContentContainer } from '@/src/components/atoms';

// Combine both product and checkout data fetching into one getServerSideProps
export const getServerSideProps = async (context: any) => {
    // Fetch product data (static props)
    const productData = await productGetStaticProps(context);
    console.log("productData",productData);

    // Fetch checkout data (server-side props)
    const checkoutData = await checkoutGetServerSideProps(context);
    console.log("checkoutData",checkoutData);

    return {
        props: {
            ...productData.props, // Merged product data
            ...checkoutData.props, // Merged checkout data
            ...(await serverSideTranslations(context.locale ?? 'en', ['checkout'])),
        },
    };
};

const Page: React.FC<InferGetServerSidePropsType<typeof getServerSideProps>> = ({ product, availableCountries, checkout, ...props }) => {
    return (
        <Wrapper>
            {/* Product Landing Content */}
            {product?.customFields?.landing && (
                <ContentContainer>
                    <StyledLandingContent dangerouslySetInnerHTML={{ __html: product.customFields.landing || '' }} />
                </ContentContainer>
            )}

            {/* Checkout Page */}
            <CheckoutPage {...props} />
        </Wrapper>
    );
};

export default Page;

// Styled components
const Wrapper = styled.div`
    margin: 0 auto;
    padding: 2rem;
    max-width: 1200px;
    font-family: Arial, sans-serif;
`;

const StyledLandingContent = styled.div`
    margin-bottom: 2rem;
    font-size: 16px;
    line-height: 1.5;

    img {
        max-width: 100%;
        height: auto;
    }
`;
