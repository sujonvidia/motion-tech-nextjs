import React from 'react';
import type { InferGetStaticPropsType } from 'next';
import { getStaticProps } from '@/src/components/pages/products/props';
import { getStaticPaths } from '@/src/components/pages/products/paths';
import { ProductPage } from '@/src/components/pages/products'; // Reuse the existing ProductPage component
import styled from '@emotion/styled';
import { ContentContainer } from '@/src/components/atoms';
import { CheckoutPage } from '@/src/components/pages/checkout'; // Import the CheckoutPage component
import { CheckoutProvider } from '@/src/state/checkout';

const LandingPage = (props: InferGetStaticPropsType<typeof getStaticProps>) => {
    const product = props.product;

    if (!product?.customFields?.landing) {
        return (
            <Wrapper>
                <p>Landing content is not available for this product.</p>
            </Wrapper>
        );
    }

    return (
        <CheckoutProvider>
        <Wrapper>
            <ContentContainer>
                {/* Render the landing content */}
                <LandingContent dangerouslySetInnerHTML={{ __html: product.customFields.landing || '' }} />
                
                {/* Include product-specific details */}
                <AdditionalDetails>
                    <h2>{product.name}</h2>
                    {product.variants.length > 0 && (
                        <p>Price: {product.variants[0].priceWithTax} {product.variants[0].currencyCode}</p>
                    )}
                </AdditionalDetails>
                
                {/* Render the checkout page below the landing content */}
                <CheckoutContainer>
                    <CheckoutPage />
                </CheckoutContainer>
            </ContentContainer>
        </Wrapper>
        </CheckoutProvider>
    );
};

export default LandingPage;

export { getStaticProps, getStaticPaths };

const Wrapper = styled.div`
    margin: 0 auto;
    padding: 2rem;
    max-width: 1200px;
    font-family: Arial, sans-serif;
`;

const LandingContent = styled.div`
    margin-bottom: 2rem;
    font-size: 16px;
    line-height: 1.5;

    img {
        max-width: 100%;
        height: auto;
    }
`;

const AdditionalDetails = styled.div`
    margin-top: 2rem;
    border-top: 1px solid #ddd;
    padding-top: 1rem;

    h2 {
        font-size: 1.5rem;
        margin-bottom: 1rem;
    }

    p {
        font-size: 1rem;
    }
`;

const CheckoutContainer = styled.div`
    margin-top: 3rem;
    border-top: 2px solid #ccc;
    padding-top: 2rem;
`;