import injectable from "../decorators/injectable";
import {instance as globalContainer} from "../dependency-container";
import Lifecycle from "../types/lifecycle";
import scoped from "../decorators/scoped";

describe("Scoped registrations", () => {
  describe("ResolutionScoped", () => {
    afterEach(() => {
      globalContainer.reset();
    });

    it("uses the same instance during the same resolution chain", async () => {
      class X {}

      @injectable()
      class B {
        constructor(public x: X) {}
      }

      @injectable()
      class C {
        constructor(public x: X) {}
      }

      @injectable()
      class A {
        constructor(public b: B, public c: C) {}
      }

      globalContainer.register(
        X,
        {useClass: X},
        {lifecycle: Lifecycle.ResolutionScoped}
      );
      const a = await globalContainer.resolve(A);

      expect(a.b.x).toBe(a.c.x);
    });

    it("uses different instances for difference resolution chains", async () => {
      class X {}

      @injectable()
      class B {
        constructor(public x: X) {}
      }

      @injectable()
      class A {
        constructor(public b: B) {}
      }

      globalContainer.register(
        X,
        {useClass: X},
        {lifecycle: Lifecycle.ResolutionScoped}
      );
      const a = await globalContainer.resolve(A);
      const b = await globalContainer.resolve(A);

      expect(a.b.x).not.toBe(b.b.x);
    });
  });

  describe("ContainerScoped", () => {
    afterEach(() => {
      globalContainer.reset();
    });

    it("creates a new instance of requested service within a scope using class provider", async () => {
      class Foo {}

      debugger;
      globalContainer.register(Foo, Foo, {
        lifecycle: Lifecycle.ContainerScoped
      });

      const foo1 = await globalContainer.resolve(Foo);

      expect(foo1).toBeInstanceOf(Foo);

      const scope = globalContainer.createChildContainer();
      const foo2 = await scope.resolve(Foo);
      const foo3 = await scope.resolve(Foo);

      expect(foo2).toBeInstanceOf(Foo);
      expect(foo3).toBeInstanceOf(Foo);
      expect(foo1 === foo2).toBeFalsy();
      expect(foo2 === foo3).toBeTruthy();
    });

    it("creates a new instance of requested service within a scope using token provider", async () => {
      interface IBar {
        void: string;
      }
      class Foo implements IBar {
        void = "";
      }

      globalContainer.register("IBar", Foo, {
        lifecycle: Lifecycle.ContainerScoped
      });
      globalContainer.register(
        Foo,
        {useToken: "IBar"},
        {
          lifecycle: Lifecycle.Transient
        }
      );

      const foo1 = await globalContainer.resolve(Foo);

      expect(foo1).toBeInstanceOf(Foo);

      const scope = globalContainer.createChildContainer();
      const foo2 = await scope.resolve(Foo);
      const foo3 = await scope.resolve(Foo);

      expect(foo2).toBeInstanceOf(Foo);
      expect(foo3).toBeInstanceOf(Foo);
      expect(foo1 === foo2).toBeFalsy();
      expect(foo2 === foo3).toBeTruthy();
    });

    it("should not create a new instance of requested singleton service", async () => {
      class Bar {}

      globalContainer.registerSingleton(Bar, Bar);

      const bar1 = await globalContainer.resolve(Bar);

      expect(bar1).toBeInstanceOf(Bar);

      const scope = globalContainer.createChildContainer();
      const bar2 = await scope.resolve(Bar);

      expect(bar2).toBeInstanceOf(Bar);
      expect(bar1 === bar2).toBeTruthy();
    });

    it("allows multiple scope levels", async () => {
      class Bar {}

      globalContainer.register(Bar, Bar, {
        lifecycle: Lifecycle.ContainerScoped
      });
      const bar = await globalContainer.resolve(Bar);

      const scope1 = globalContainer.createChildContainer();
      const bar1 = await scope1.resolve(Bar);

      const scope2 = scope1.createChildContainer();
      const bar2 = await scope2.resolve(Bar);

      expect(bar === bar1).toBeFalsy();
      expect(bar === bar2).toBeFalsy();
      expect(bar1 === bar2).toBeFalsy();

      expect(bar === (await globalContainer.resolve(Bar))).toBeTruthy();
      expect(bar1 === (await scope1.resolve(Bar))).toBeTruthy();
      expect(bar2 === (await scope2.resolve(Bar))).toBeTruthy();
    });

    it("@scoped decorator registers class as scoped", async () => {
      @scoped(Lifecycle.ContainerScoped)
      class Foo {}

      const foo1 = await globalContainer.resolve(Foo);

      expect(foo1).toBeInstanceOf(Foo);

      const scope = globalContainer.createChildContainer();
      const foo2 = await scope.resolve(Foo);
      const foo3 = await scope.resolve(Foo);

      expect(foo2).toBeInstanceOf(Foo);
      expect(foo3).toBeInstanceOf(Foo);
      expect(foo1 === foo2).toBeFalsy();
      expect(foo2 === foo3).toBeTruthy();
    });

    it("@scoped decorator registers class as scoped using custom token", async () => {
      @scoped(Lifecycle.ContainerScoped, "Foo")
      class Foo {}

      const foo1 = await globalContainer.resolve("Foo");

      expect(foo1).toBeInstanceOf(Foo);

      const scope = globalContainer.createChildContainer();
      const foo2 = await scope.resolve("Foo");
      const foo3 = await scope.resolve("Foo");

      expect(foo2).toBeInstanceOf(Foo);
      expect(foo3).toBeInstanceOf(Foo);
      expect(foo1 === foo2).toBeFalsy();
      expect(foo2 === foo3).toBeTruthy();
    });

    it("resolve all resolves scoped dependencies properly", async () => {
      interface Foo {
        test: string;
      }

      class FooBar implements Foo {
        test = "bar";
      }

      class FooQux implements Foo {
        test = "qux";
      }

      globalContainer.registerSingleton<Foo>("Foo", FooBar);
      globalContainer.register<Foo>("Foo", FooQux, {
        lifecycle: Lifecycle.ContainerScoped
      });
      const foo1 = await globalContainer.resolveAll<Foo>("Foo");
      const foo2 = await globalContainer.resolveAll<Foo>("Foo");

      expect(foo1[0] === foo2[0]).toBeTruthy();
      expect(foo1[1] === foo2[1]).toBeTruthy();

      const scope = globalContainer.createChildContainer();
      const foo3 = await scope.resolveAll<Foo>("Foo");
      const foo4 = await scope.resolveAll<Foo>("Foo");

      expect(foo3[0] === foo4[0]).toBeTruthy();
      expect(foo3[1] === foo4[1]).toBeTruthy();

      expect(foo3[0] === foo1[0]).toBeTruthy();
      expect(foo4[0] === foo2[0]).toBeTruthy();

      expect(foo3[1] === foo1[1]).toBeFalsy();
      expect(foo4[1] === foo2[1]).toBeFalsy();
    });
  });
});
