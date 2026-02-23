import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { TH1, TP, ContentContainer, Stack, Price, Link } from '@/src/components/atoms';
import { FullWidthButton, FullWidthSecondaryButton } from '@/src/components/molecules/Button';
import { NotifyMeForm } from '@/src/components/molecules/NotifyMeForm';
import { ProductPageProductsSlider } from '@/src/components/organisms/ProductPageProductsSlider';
// import { ProductPhotosPreview } from '@/src/components/organisms/ProductPhotosPreview';
import { Layout } from '@/src/layouts';
import styled from '@emotion/styled';
import { Check, X } from 'lucide-react';
import { InferGetStaticPropsType } from 'next';

import { Trans, useTranslation } from 'next-i18next';
import { ProductOptions } from '@/src/components/organisms/ProductOptions';
import { Breadcrumbs } from '@/src/components/molecules';
import { useProduct } from '@/src/state/product';
import { ProductPhotosPreview } from '@/src/components/organisms/ProductPhotosPreview';
import { getStaticProps } from '@/src/components/pages/products/props';
import { ProductDescription } from '@/src/components/molecules/ProductDescription';
import { storefrontApiQuery } from '@/src/graphql/client';
import { useChannels } from '@/src/state/channels';
import { ProductVariantTileType, productVariantTileSelector } from '@/src/graphql/selectors';


const Editor = dynamic<any>(
    () =>
        import('@tinymce/tinymce-react').then(
            mod => mod.Editor as unknown as React.ComponentType<any>,
        ),
    { ssr: false },
);


export const OfferPage: React.FC<InferGetStaticPropsType<typeof getStaticProps>> = props => {
    const { t } = useTranslation('products');
    const { t: breadcrumb } = useTranslation('common');
    const ctx = useChannels();
    const { product, variant, addingError, productOptionsGroups, handleOptionClick, handleBuyNow, handleAddToCart } =
        useProduct();
    const landingContent = (product?.customFields as { landing?: string } | undefined)?.landing;

    console.log('OfferPage', product);
    
    const [recentlyProducts, setRecentlyProducts] = useState<ProductVariantTileType[]>([]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const fetchData = async () => {
            try {
                const cookie = window.document.cookie.split('; ').find(row => row.startsWith('recentlyViewed'));
                if (!cookie) return;
                const recentlyViewed = cookie.split('=')[1].split(',');
                const { collection } = await storefrontApiQuery(ctx)({
                    collection: [
                        { slug: 'all' },
                        {
                            productVariants: [
                                { options: { filter: { id: { in: recentlyViewed } } } },
                                { items: productVariantTileSelector },
                            ],
                        },
                    ],
                });
                if (collection?.productVariants?.items.length) setRecentlyProducts(collection.productVariants.items);
            } catch (error) {
                console.log(error);
            }
        };
        fetchData();
    }, [product?.id]);

    function makeAbsoluteUrls(htmlContent: string) {
        return htmlContent.replace(/src="\.\.\/\.\.\/\.\.\//g, 'src="http://localhost:3000/');
    }

    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) return null; // Skip rendering on the server

    return (
        <Layout categories={props.collections} navigation={props.navigation}>
            <ContentContainer>
                <Wrapper column>
                    {/* <Breadcrumbs breadcrumbs={breadcrumbs} /> */}
                    <Main gap="5rem">
                       
                        <StyledStack w100 column gap="2rem">
                            
                            <Stack w100>
                                {product && product.variants.length > 1 ? (
                                    <ProductOptions
                                        productOptionsGroups={productOptionsGroups}
                                        handleClick={handleOptionClick}
                                        addingError={addingError}
                                    />
                                ) : null}
                            </Stack>
                            <Stack w100 gap="1rem" column>
                                {variant && Number(variant.stockLevel) > 0 && Number(variant.stockLevel) <= 10 && (
                                    <MakeItQuick size="1.5rem" weight={500}>
                                        <Trans
                                            i18nKey="stock-levels.low-stock"
                                            t={t}
                                            values={{ value: variant?.stockLevel }}
                                            components={{ 1: <span></span> }}
                                        />
                                    </MakeItQuick>
                                )}
                                <StockInfo
                                    comingSoon={!variant}
                                    outOfStock={Number(variant?.stockLevel) <= 0}
                                    itemsCenter
                                    gap="0.25rem">
                                    {!variant ? null : Number(variant.stockLevel) > 0 ? (
                                        <Check size="1.75rem" />
                                    ) : (
                                        <X />
                                    )}
                                    <TP>
                                        {!variant
                                            ? null
                                            : Number(variant.stockLevel) > 0
                                                ? t('stock-levels.in-stock')
                                                : t('stock-levels.out-of-stock')}
                                    </TP>
                                </StockInfo>
                            </Stack>
                            {!variant ? null : Number(variant.stockLevel) <= 0 ? (
                                <NotifyMeForm />
                            ) : (
                                <Stack w100 gap="2.5rem" justifyBetween column>
                                    <FullWidthButton
                                        style={{ textTransform: 'uppercase', padding: '1.5rem' }}
                                        onClick={handleAddToCart}>
                                        {t('add-to-cart')}
                                    </FullWidthButton>
                                    <FullWidthSecondaryButton
                                        style={{ textTransform: 'uppercase', padding: '1.5rem' }}
                                        onClick={handleBuyNow}>
                                        {t('buy-now')}
                                    </FullWidthSecondaryButton>
                                </Stack>
                            )}
                            <ProductDescription
                                defaultOpenIndexes={[1]}
                                data={[
                                    {
                                        title: t('description'),
                                        children: (
                                            <TP color="subtitle" style={{ marginTop: '1.5rem' }}>
                                                {landingContent ? (
                                                    <div suppressHydrationWarning>
                                                        <Editor
                                                            apiKey="d1hzqw9ym2dak60p72jjeq0iqypm8vtd44xtzwhv05kkp9r7" // Replace with your TinyMCE API key
                                                            initialValue={landingContent} // Use landing content directly
                                                            init={{
                                                                height: 500,
                                                                menubar: false, // Hide menubar
                                                                toolbar: false, // Hide toolbar
                                                                statusbar: false, // Hide status bar
                                                                // readonly: true, // Make the editor read-only
                                                                content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }', // Customize styling
                                                                inline: true, // Make the editor inline (not a full block editor)
                                                            }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <span>{t('description')}</span> // Fallback if `landing` is undefined
                                                )}
                                            </TP>
                                        ),
                                    }
                                ]}
                            />
                        </StyledStack>
                    </Main>
                   
                </Wrapper>
            </ContentContainer>
        </Layout>
    );
};

const CategoryBlock = styled(Link)`
    width: fit-content;
`;

const ProductInfoStack = styled(Stack)`
    border-bottom: 2px solid ${({ theme }) => theme.gray(100)};
    padding-bottom: 7.5rem;
`;

const Wrapper = styled(Stack)`
    padding-top: 2rem;
    @media (min-width: ${p => p.theme.breakpoints.xl}) {
        padding: 3.5rem 0;
    }
`;

const MakeItQuick = styled(TP)`
    color: ${({ theme }) => theme.error};
`;

const StickyLeft = styled(Stack)`
    @media (min-width: 1024px) {
        position: sticky;
        top: 12rem;
    }
`;

const StockInfo = styled(Stack) <{ outOfStock?: boolean; comingSoon?: boolean }>`
    white-space: nowrap;
    color: ${p => (p.outOfStock ? p.theme.error : p.comingSoon ? p.theme.gray(800) : 'inherit')};
    width: max-content;
    @media (min-width: 1024px) {
        width: 100%;
    }
`;

const StyledStack = styled(Stack)`
    justify-content: center;
    align-items: center;
    @media (min-width: 1024px) {
        justify-content: flex-start;
        align-items: flex-start;
    }
`;

const Main = styled(Stack)`
    padding: 1.5rem 0;
    flex-direction: column;
    align-items: start;
    @media (min-width: 1024px) {
        flex-direction: row;
        padding: 4rem 0;
    }
    margin-bottom: 2rem;
    border-bottom: 1px solid ${({ theme }) => theme.gray(100)};
`;
