import React, { useEffect, useState } from 'react';
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next';
import { getStaticProps as productGetStaticProps } from '@/src/components/pages/products/props';
import { CheckoutPage } from '@/src/components/pages/checkout';
import { CheckoutProvider } from '@/src/state/checkout';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { priceFormatter } from '@/src/util/priceFormatter';
import { CurrencyCode } from '@/src/zeus';
import styled from '@emotion/styled';
import { ActiveCustomerSelector, ActiveCustomerType, ActiveOrderSelector, ActiveOrderType, ShippingMethodsSelector } from '@/src/graphql/selectors';
import { SSRMutation, SSRQuery, storefrontApiMutation, storefrontApiQuery } from '@/src/graphql/client';
import { useChannels } from '@/src/state/channels';

const plainText = (value?: string) => value?.replace(/<[^>]*>/g, '').trim() || '';
const landingMarkup = (value: string) => value
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/href=["']\/checkout\/?["']/gi, 'href="#order"')
    .replace(/id=["']order["']/gi, 'id="product-details"');

const LandingPage = (props: InferGetServerSidePropsType<typeof getServerSideProps>) => {
    const { t } = useTranslation('checkout');
    const { product, initialActiveOrder } = props;
    const [checkoutOrder, setCheckoutOrder] = useState<ActiveOrderType | undefined>(initialActiveOrder);
    const [orderError, setOrderError] = useState(false);
    const [loading, setLoading] = useState(false);
    const ctx = useChannels();

    useEffect(() => {
        const fetchOrderData = async () => {
            try {
                console.log('offer useEffect', { product: product?.name, checkoutOrder });
                const offerVariant = product?.variants?.[0];
                if (!offerVariant) {
                    return;
                }
                let activeOrder = checkoutOrder;
                if (!activeOrder) {
                    const [{ activeOrder: fetched }] = await Promise.all([
                        storefrontApiQuery(ctx)({ activeOrder: ActiveOrderSelector }),
                    ]);
                    activeOrder = fetched;
                    console.log('fetched activeOrder', activeOrder);
                    setCheckoutOrder(fetched);
                }

                const isProductInOrder = activeOrder?.lines?.some(
                    line => line.productVariant.id === offerVariant.id
                );
                console.log('isProductInOrder', isProductInOrder, 'lines', activeOrder?.lines?.map(l => l.productVariant.id));

                if (!isProductInOrder) {
                    setLoading(true);
                    if (activeOrder?.lines?.length > 0) {
                        console.log('clearing cart');
                        await storefrontApiMutation(ctx)({
                            removeAllOrderLines: {
                                __typename: true,
                                '...on Order': ActiveOrderSelector,
                                '...on OrderModificationError': { errorCode: true, message: true },
                            },
                        });
                    }
                    console.log('adding offer item');
                    const addResult = await storefrontApiMutation(ctx)({
                        addItemToOrder: [
                            { productVariantId: offerVariant.id, quantity: 1 },
                            {
                                __typename: true,
                                '...on Order': ActiveOrderSelector,
                                '...on OrderLimitError': { errorCode: true, message: true },
                                '...on InsufficientStockError': { errorCode: true, message: true },
                                '...on NegativeQuantityError': { errorCode: true, message: true },
                                '...on OrderModificationError': { errorCode: true, message: true },
                            },
                        ],
                    });
                    console.log('addItemToOrder result', addResult);
                    if (addResult?.__typename === 'Order') {
                        console.log('setting checkoutOrder', addResult);
                        setCheckoutOrder(addResult);
                    }
                }
            } catch (e) {
                console.error('Failed to add item to order on offer page', e);
                setOrderError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchOrderData();
    }, [product]);

    const landingContent = (product?.customFields as { landing?: string } | undefined)?.landing;
    const featuredImage = (product?.featuredAsset as { preview?: string } | undefined)?.preview?.replace(/\\/g, '/');
    const firstVariant = product?.variants?.[0];

    if (!landingContent) {
        return (
            <Wrapper>
                <p>{t('landingPage.notAvailable', 'Landing content is not available for this product.')}</p>
            </Wrapper>
        );
    }

    return (
        <Wrapper>
            <OfferHeader>
                <BrandMark><BrandDot /> Roast & Ritual</BrandMark>
                <HeaderLink href="#order">Order {product.name}</HeaderLink>
            </OfferHeader>

            <Hero image={featuredImage}>
                <HeroCopy>
                    <Eyebrow>Small batch coffee - Delivered fresh</Eyebrow>
                    <HeroTitle>{product.name}</HeroTitle>
                    <HeroDescription>{plainText(product.description) || 'A considered roast for slow mornings and bright beginnings.'}</HeroDescription>
                    <HeroActions>
                        <PrimaryLink href="#order">Make it yours</PrimaryLink>
                        {firstVariant && (
                            <HeroPrice>
                                {priceFormatter(firstVariant.priceWithTax, (firstVariant.currencyCode as CurrencyCode) || CurrencyCode.BDT)}
                            </HeroPrice>
                        )}
                    </HeroActions>
                </HeroCopy>
                <HeroStamp>Roasted<br />with care</HeroStamp>
            </Hero>

            <LandingSurface>
                <StyledLandingContent dangerouslySetInnerHTML={{ __html: landingMarkup(landingContent) }} />
            </LandingSurface>

            <ProductDetails>
                <DetailKicker>From our roastery</DetailKicker>
                <DetailTitle>{product.name}</DetailTitle>
                <DetailText>{plainText(product.description) || 'A balanced cup with a smooth finish, made for your everyday ritual.'}</DetailText>
                {firstVariant && (
                    <DetailPrice>
                        {priceFormatter(firstVariant.priceWithTax, (firstVariant.currencyCode as CurrencyCode) || CurrencyCode.BDT)}
                    </DetailPrice>
                )}
            </ProductDetails>

            <CheckoutSection id="order">
                <SectionKicker>Ready when you are</SectionKicker>
                <SectionTitle>Bring better coffee home.</SectionTitle>
                {checkoutOrder ? (
                    <CheckoutProvider
                        key={`${checkoutOrder.id}-${checkoutOrder.lines?.[0]?.id || 'empty'}`}
                        initialState={{ checkout: checkoutOrder }}
                    >
                        <CheckoutContent loading={loading} />
                    </CheckoutProvider>
                ) : orderError ? (
                    <CheckoutMessage>Unable to load the order. Please refresh and try again.</CheckoutMessage>
                ) : (
                    <CheckoutMessage>{t('orderSummary.loading', 'Loading Order Summary...')}</CheckoutMessage>
                )}
            </CheckoutSection>

            <OfferFooter>
                <BrandMark><BrandDot /> Roast & Ritual</BrandMark>
                <FooterText>Thoughtfully sourced. Carefully roasted. Enjoyed daily.</FooterText>
            </OfferFooter>
        </Wrapper>
    );
};

const CheckoutContent = ({ loading }: { loading: boolean }) => {
    const ctx = useChannels();
    const { t } = useTranslation('checkout');
    const [shippingMethods, setShippingMethods] = useState<any[]>([]);
    const [activeCustomer, setActiveCustomer] = useState<ActiveCustomerType | null>(null);

    useEffect(() => {
        Promise.all([
            storefrontApiQuery(ctx)({ eligibleShippingMethods: ShippingMethodsSelector }),
            storefrontApiQuery(ctx)({ activeCustomer: ActiveCustomerSelector }),
        ])
            .then(([shippingResponse, customerResponse]) => {
                setShippingMethods(shippingResponse.eligibleShippingMethods ?? []);
                setActiveCustomer(customerResponse.activeCustomer ?? null);
            })
            .catch(error => console.error('Failed to load shipping methods', error));
    }, [ctx.channel, ctx.locale]);

    return loading ? (
        <p>{t('orderSummary.loading', 'Loading Order Summary...')}</p>
    ) : (
        <CheckoutContainer>
            <CheckoutPage
                paymentMethod="cash"
                shippingMethods={shippingMethods}
                activeCustomer={activeCustomer}
            />
        </CheckoutContainer>
    );
};

export default LandingPage;

export const getServerSideProps: GetServerSideProps = async (context) => {
    const { params, locale, req } = context;

    if (!params?.slug || (Array.isArray(params.slug) && params.slug.length === 0)) {
        return { notFound: true };
    }

    const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
    const channel = 'cgyub4spjr2ycq17h6x';

    const productProps = await productGetStaticProps({
        params: { slug, locale: locale ?? 'en', channel },
    });

    const product = productProps?.props?.product;
    let initialActiveOrder: ActiveOrderType | undefined;

    if (product && product.variants && product.variants.length > 0) {
        const firstVariant = product.variants[0];
        try {
            const existingOrderResult = await SSRQuery(context)({
                activeOrder: { id: true, totalQuantity: true },
            });
            if (existingOrderResult.activeOrder?.totalQuantity && existingOrderResult.activeOrder.totalQuantity > 0) {
                await SSRMutation(context)({
                    removeAllOrderLines: {
                        __typename: true,
                        '...on Order': ActiveOrderSelector,
                        '...on OrderModificationError': { errorCode: true, message: true },
                    },
                });
            }
            const result = await SSRMutation(context)({
                addItemToOrder: [
                    { productVariantId: firstVariant.id, quantity: 1 },
                    {
                        __typename: true,
                        '...on Order': ActiveOrderSelector,
                        '...on OrderLimitError': { errorCode: true, message: true },
                        '...on InsufficientStockError': { errorCode: true, message: true },
                        '...on NegativeQuantityError': { errorCode: true, message: true },
                        '...on OrderModificationError': { errorCode: true, message: true },
                    },
                ],
            });
            if (result?.addItemToOrder?.__typename === 'Order') {
                initialActiveOrder = result.addItemToOrder;
            }
        } catch (e) {
            console.error('Failed to add item to order on offer page', e);
        }
    }

    return {
        props: {
            ...productProps.props,
            ...(initialActiveOrder ? { initialActiveOrder } : {}),
            ...(await serverSideTranslations(locale ?? 'en', ['checkout'])),
        },
    };
};

const Wrapper = styled.div`
    min-height: 100vh;
    color: #30251f;
    background: #f4efe8;
    font-family: Georgia, 'Times New Roman', serif;
`;

const OfferHeader = styled.header`
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1240px;
    margin: 0 auto;
    padding: 2.4rem 4rem;
    background: #f4efe8;
    @media (max-width: 600px) { padding: 2rem; }
`;

const BrandMark = styled.div`
    display: flex;
    align-items: center;
    gap: .8rem;
    color: #30251f;
    font-size: 1.8rem;
    font-weight: 700;
    letter-spacing: .04em;
`;

const BrandDot = styled.span`
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    background: #b85c38;
`;

const HeaderLink = styled.a`
    color: #30251f;
    font-size: 1.5rem;
    font-weight: 700;
    border-bottom: 1px solid #30251f;
    padding-bottom: .4rem;
`;

const Hero = styled.section<{ image?: string }>`
    position: relative;
    display: flex;
    align-items: flex-end;
    min-height: min(50rem, 54vh);
    overflow: hidden;
    border-radius: 0 0 2.8rem 2.8rem;
    background: ${({ image }) => image ? `linear-gradient(90deg, rgba(83, 48, 30, .52) 0%, rgba(83, 48, 30, .2) 56%, rgba(83, 48, 30, .04) 100%), url("${image}") center/cover` : '#a87658'};
`;

const HeroCopy = styled.div`
    position: relative;
    z-index: 1;
    max-width: 1240px;
    width: 100%;
    margin: 0 auto;
    padding: 7rem 4rem;
    color: #fff;
    @media (max-width: 600px) { padding: 8rem 2.4rem 7rem; }
`;

const Eyebrow = styled.p`
    margin-bottom: 1.8rem;
    color: #e8ad78;
    font-family: Arial, sans-serif;
    font-size: 2.5rem;
    font-weight: 700;
    letter-spacing: .16em;
    text-transform: uppercase;
`;

const HeroTitle = styled.h1`
    max-width: 68rem;
    margin-bottom: 2rem;
    font-size: 2.5rem;
    line-height: .94;
`;

const HeroDescription = styled.p`
    max-width: 52rem;
    margin-bottom: 3.2rem;
    color: #f6e8dc;
    font-size: 2.5rem;
    line-height: 1.45;
`;

const HeroActions = styled.div` display: flex; align-items: center; gap: 2rem; flex-wrap: wrap; `;
const PrimaryLink = styled.a`
    display: inline-block;
    padding: 1.5rem 2.4rem;
    color: #30251f;
    background: #e8ad78;
    font-family: Arial, sans-serif;
    font-size: 2.5rem;
    font-weight: 700;
`;
const HeroPrice = styled.span` color: #fff; font-size: 2.5rem; font-weight: 700; `;
const HeroStamp = styled.div`
    position: absolute;
    right: 6%;
    bottom: 8%;
    z-index: 1;
    display: grid;
    place-items: center;
    width: 10rem;
    height: 10rem;
    border: 1px solid #e8ad78;
    border-radius: 50%;
    color: #e8ad78;
    font-size: clamp(1rem, 1.2vw, 1.3rem);
    line-height: 1.2;
    text-align: center;
    transform: rotate(12deg);
    @media (max-width: 600px) { right: 2rem; bottom: 2rem; transform: scale(.75) rotate(12deg); }
`;

const LandingSurface = styled.main`
    position: relative;
    background: #f4efe8;
    background-image: radial-gradient(#d8c5b4 1px, transparent 1px);
    background-size: 2.4rem 2.4rem;
`;

const StyledLandingContent = styled.div`
    max-width: 112rem;
    margin: 0 auto;
    padding: 7rem 4rem;
    border-radius: 2.8rem;
    background: rgba(255, 252, 247, .97);
    font-family: Arial, sans-serif;
    font-size: 1.6rem;
    line-height: 1.65;
    @media (max-width: 600px) { padding: 4rem 2rem; }

    .hero > div:nth-child(2) {
        margin-right: auto !important;
        margin-left: auto !important;
        padding: clamp(2rem, 4vw, 4rem) !important;
        border-radius: 2.4rem !important;
        background: transparent !important;
        text-align: center !important;
    }

    .hero > div:nth-child(2) > h1 {
        font-size: 3rem !important;
        line-height: normal !important;
    }

    .hero > div:nth-child(2) > p {
        margin-top: 1.8rem !important;
        margin-bottom: 2.6rem !important;
        font-size: 3rem !important;
    }

    .hero > div:nth-child(2) > h1,
    .hero > div:nth-child(2) > p,
    .hero > div:nth-child(2) > a {
        margin-right: auto !important;
        margin-left: auto !important;
    }

    img {
        display: none;
    }

    .hero {
        background: #ead7c6 !important;
        color: #5b3524 !important;
        border-radius: 2rem !important;
        overflow: hidden !important;
    }

    .hero > div:first-child {
        display: none;
    }

    .hero h1,
    .hero h2,
    .hero h3,
    .hero p,
    .hero a,
    h1,
    h2,
    h3,
    p,
    li,
    blockquote {
        color: #5b3524 !important;
    }

    .hero a[href="#order"],
    a[href="#order"],
    a[href="/checkout"] {
        display: inline-block;
        border: 0 !important;
        border-radius: 999px;
        padding: 1.4rem 2.4rem !important;
        color: #fff !important;
        background: #b85c38 !important;
        border-radius: 999px !important;
        box-shadow: 0 .8rem 1.8rem rgba(112, 54, 32, .2);
        font-weight: 700;
        transition: transform .2s ease, box-shadow .2s ease, background-color .2s ease;
    }

    .hero a[href="#order"]:hover,
    a[href="#order"]:hover,
    a[href="/checkout"]:hover {
        background: #8f4027 !important;
        box-shadow: 0 1.1rem 2.4rem rgba(112, 54, 32, .3);
        transform: translateY(-.2rem);
    }

    .hero a[href="#order"]:focus-visible,
    a[href="#order"]:focus-visible,
    a[href="/checkout"]:focus-visible {
        outline: .3rem solid #e8ad78;
        outline-offset: .3rem;
    }

    section {
        text-align: center !important;
    }

    section > div {
        justify-items: center !important;
    }

    section > div > div {
        width: 100% !important;
        text-align: center !important;
    }

    section ul {
        padding-left: 0 !important;
        list-style-position: inside !important;
    }

    a[href="#order"],
    a[href="/checkout"] {
        display: inline-block !important;
        border: 0 !important;
        border-radius: 999px !important;
        padding: 1.4rem 2.4rem !important;
        color: #fff !important;
        background: #b85c38 !important;
        box-shadow: 0 .8rem 1.8rem rgba(112, 54, 32, .2) !important;
        font-weight: 700 !important;
        transition: transform .2s ease, box-shadow .2s ease, background-color .2s ease !important;
        text-decoration: none !important;
        cursor: pointer !important;
    }

    a[href="#order"]:hover,
    a[href="/checkout"]:hover {
        background: #8f4027 !important;
        box-shadow: 0 1.1rem 2.4rem rgba(112, 54, 32, .3) !important;
        transform: translateY(-.2rem) !important;
    }

    a[href="#order"]:active,
    a[href="/checkout"]:active {
        transform: translateY(0) !important;
        box-shadow: 0 .4rem .8rem rgba(112, 54, 32, .25) !important;
    }

    @media (max-width: 600px) {
        section {
            text-align: center !important;
        }

        section > div {
            justify-items: center !important;
        }

        section > div > div {
            width: 100% !important;
            text-align: center !important;
        }

        section ul {
            padding-left: 0 !important;
            list-style-position: inside !important;
        }
    }
`;

const ProductDetails = styled.section`
    max-width: 80rem;
    margin: 0 auto;
    padding: 8rem 2rem;
    text-align: center;
`;
const DetailKicker = styled.p` color: #b85c38; font-family: Arial, sans-serif; font-size: clamp(1rem, 1.2vw, 1.2rem); font-weight: 700; letter-spacing: .15em; text-transform: uppercase; `;
const DetailTitle = styled.h2` margin: 1rem 0; font-size: clamp(1.8rem, 2.5vw, 2.5rem); `;
const DetailText = styled.p` color: #67554a; font-size: clamp(1.2rem, 1.5vw, 1.5rem); line-height: 1.5; `;
const DetailPrice = styled.p` margin-top: 2rem; color: #b85c38; font-size: clamp(1.5rem, 2vw, 2rem); font-weight: 700; `;

const CheckoutSection = styled.section`
    padding: 7rem max(2rem, calc((100% - 112rem) / 2));
    background: #30251f;
    color: #fff;
`;
const SectionKicker = styled.p` color: #e8ad78; font-family: Arial, sans-serif; font-size: clamp(1rem, 1.2vw, 1.2rem); font-weight: 700; letter-spacing: .15em; text-transform: uppercase; `;
const SectionTitle = styled.h2` margin: 1rem 0 3rem; color: #fff; font-size: clamp(1.8rem, 2.5vw, 2.5rem); `;
const CheckoutMessage = styled.p` color: #f6e8dc; font-size: 1.7rem; `;

const OfferFooter = styled.footer`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
    max-width: 1240px;
    margin: 0 auto;
    padding: 4rem;
    @media (max-width: 600px) { flex-direction: column; align-items: flex-start; padding: 3rem 2rem; }
`;
const FooterText = styled.p` color: #67554a; font-family: Arial, sans-serif; font-size: 1.4rem; `;

const CheckoutContainer = styled.div`
    margin-top: 3rem;
    border-top: 2px solid #ccc;
    padding-top: 2rem;
`;
